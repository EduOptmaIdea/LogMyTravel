-- Supabase SQL: Estrutura para KM por veículo e agregações
-- Executar em desenvolvimento; ajustar RLS em produção

create extension if not exists pgcrypto;

-- Tabela de vínculo explícito veículo-viagem (opcional, porém útil)
create table if not exists trip_vehicles (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  user_id uuid null,
  linked_at timestamptz not null default now(),
  unique (trip_id, vehicle_id)
);

create index if not exists idx_tv_trip_vehicle on trip_vehicles (trip_id, vehicle_id);

-- Tabela de segmentos de KM por veículo na viagem
create table if not exists trip_vehicle_segments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  user_id uuid null,
  segment_date date not null,
  initial_km numeric(12,2) not null check (initial_km >= 0),
  current_km numeric(12,2) not null check (current_km >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (current_km >= initial_km)
);

create index if not exists idx_tvs_trip_vehicle_date on trip_vehicle_segments (trip_id, vehicle_id, segment_date);

-- Trigger utilitário para updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Garantir search_path explícito para evitar alerta de segurança
alter function set_updated_at()
  set search_path to pg_catalog, public;

drop trigger if exists trg_tvs_updated_at on trip_vehicle_segments;
create trigger trg_tvs_updated_at before update on trip_vehicle_segments
for each row execute procedure set_updated_at();

-- Campo de total de KM no veículo (agregado pelos segmentos)
alter table vehicles add column if not exists km_total numeric(14,2) not null default 0;

-- Função de trigger: usa NEW/OLD internamente e não recebe parâmetros
drop function if exists refresh_vehicle_km_total(uuid);
create or replace function refresh_vehicle_km_total_trg()
returns trigger language plpgsql as $$
declare
  v_id uuid;
begin
  if TG_OP = 'DELETE' then
    v_id := OLD.vehicle_id;
  else
    v_id := NEW.vehicle_id;
  end if;

  update vehicles v
  set km_total = coalesce((
    select sum(greatest(0, s.current_km - s.initial_km))
    from trip_vehicle_segments s
    where s.vehicle_id = v_id
  ), 0)
  where v.id = v_id;

  if TG_OP = 'DELETE' then
    return OLD;
  else
    return NEW;
  end if;
end $$;

drop trigger if exists trg_tvs_refresh_total_ins on trip_vehicle_segments;
drop trigger if exists trg_tvs_refresh_total_upd on trip_vehicle_segments;
drop trigger if exists trg_tvs_refresh_total_del on trip_vehicle_segments;

create trigger trg_tvs_refresh_total_ins
after insert on trip_vehicle_segments
for each row execute procedure refresh_vehicle_km_total_trg();

create trigger trg_tvs_refresh_total_upd
after update on trip_vehicle_segments
for each row execute procedure refresh_vehicle_km_total_trg();

create trigger trg_tvs_refresh_total_del
after delete on trip_vehicle_segments
for each row execute procedure refresh_vehicle_km_total_trg();

-- Views de apoio
create or replace view trip_vehicle_totals with (security_invoker = true) as
select
  t.id as trip_id,
  v.id as vehicle_id,
  (select s.initial_km from trip_vehicle_segments s 
   where s.trip_id = t.id and s.vehicle_id = v.id
   order by s.segment_date asc, s.created_at asc limit 1) as initial_km,
  (select s.current_km from trip_vehicle_segments s 
   where s.trip_id = t.id and s.vehicle_id = v.id
   order by s.segment_date desc, s.created_at desc limit 1) as current_km,
  greatest(0, coalesce(
    (select s.current_km from trip_vehicle_segments s 
     where s.trip_id = t.id and s.vehicle_id = v.id
     order by s.segment_date desc, s.created_at desc limit 1), 0)
    - coalesce(
    (select s.initial_km from trip_vehicle_segments s 
     where s.trip_id = t.id and s.vehicle_id = v.id
     order by s.segment_date asc, s.created_at asc limit 1), 0)
  ) as total_km
from trips t
join trip_vehicles tv on tv.trip_id = t.id
join vehicles v on v.id = tv.vehicle_id;

create or replace view trip_totals with (security_invoker = true) as
select
  t.id as trip_id,
  coalesce(sum(greatest(0, s.current_km - s.initial_km)), 0) as total_km
from trips t
left join trip_vehicle_segments s on s.trip_id = t.id
group by t.id;

-- Remoção dos campos legados (executar depois que o app não usar mais)
-- alter table trips drop column if exists start_km;
-- alter table trips drop column if exists end_km;

-- RLS básico para desenvolvimento
alter table trip_vehicles enable row level security;
alter table trip_vehicle_segments enable row level security;
drop policy if exists "trip_vehicles_all" on trip_vehicles;
create policy "trip_vehicles_all" on trip_vehicles for all using (true) with check (true);

drop policy if exists "trip_vehicle_segments_all" on trip_vehicle_segments;
create policy "trip_vehicle_segments_all" on trip_vehicle_segments for all using (true) with check (true);
