-- Deactivation flow: mark profiles with deactivated_at and schedule cleanup after 30 days

-- Add column to profiles to record deactivation timestamp
alter table if exists profiles
  add column if not exists deactivated_at timestamptz;

-- Helper function to hard-delete application data for users past 30-day grace period
create or replace function app_delete_users_past_grace_period()
returns void language plpgsql as $$
declare
  target_ids uuid[];
begin
  -- Collect users whose deactivation timestamp is older than 30 days
  select array_agg(id) into target_ids
  from profiles
  where deactivated_at is not null
    and deactivated_at < now() - interval '30 days';

  if target_ids is null or array_length(target_ids, 1) is null then
    return; -- nothing to do
  end if;

  -- Delete app data referencing user_id (auth.users delete is handled externally via service role)
  delete from trip_vehicle_segments where user_id = any (target_ids);
  delete from trip_vehicles where user_id = any (target_ids);
  delete from stops where user_id = any (target_ids);
  delete from trips where user_id = any (target_ids);
  delete from vehicles where user_id = any (target_ids);

  -- Finally, remove profiles themselves (will cascade to other app-linked data if any)
  delete from profiles where id = any (target_ids);
end;
$$;

-- Enable pg_cron extension (if not already enabled)
create extension if not exists pg_cron;

-- Schedule daily cleanup at 03:10 UTC
select cron.schedule(
  'daily_user_cleanup',
  '10 3 * * *',
  $$select app_delete_users_past_grace_period();$$
);

-- Optional: immediate run for testing (comment out in production)
-- select app_delete_users_past_grace_period();

-- Add notice flags to profiles to track email notifications
alter table if exists profiles
  add column if not exists deactivation_notice_7_sent_at timestamptz,
  add column if not exists deactivation_notice_2_sent_at timestamptz;

-- Enable http extension to allow posting to local server for email dispatch
create extension if not exists http;

-- Function to send deactivation notices at 7 and 2 days remaining
create or replace function app_send_deactivation_notices()
returns void language plpgsql as $$
declare
  rec record;
  base_url text := 'http://192.168.0.3:3002/accounts/send-deactivation-email';
begin
  for rec in
    select p.id, u.email, p.deactivated_at, p.deactivation_notice_7_sent_at, p.deactivation_notice_2_sent_at
    from profiles p
    join auth.users u on u.id = p.id
    where p.deactivated_at is not null
  loop
    -- Send 7-day remaining notice at day 23 after deactivation mark
    if rec.deactivation_notice_7_sent_at is null
       and rec.deactivated_at < now() - interval '23 days'
       and rec.deactivated_at > now() - interval '30 days' then
      perform http_post(
        base_url,
        json_build_object('to', rec.email, 'type', '7_days', 'reactivationUrl', 'https://logmytravel.app/reactivar')::text,
        'application/json'
      );
      update profiles set deactivation_notice_7_sent_at = now() where id = rec.id;
    end if;

    -- Send 2-day remaining notice at day 28 after deactivation mark
    if rec.deactivation_notice_2_sent_at is null
       and rec.deactivated_at < now() - interval '28 days'
       and rec.deactivated_at > now() - interval '30 days' then
      perform http_post(
        base_url,
        json_build_object('to', rec.email, 'type', '2_days', 'reactivationUrl', 'https://logmytravel.app/reactivar')::text,
        'application/json'
      );
      update profiles set deactivation_notice_2_sent_at = now() where id = rec.id;
    end if;
  end loop;
end;
$$;

-- Schedule daily notice sender at 03:05 UTC
select cron.schedule(
  'daily_deactivation_notices',
  '5 3 * * *',
  $$select app_send_deactivation_notices();$$
);
