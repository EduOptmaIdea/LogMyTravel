-- Create or alter profiles table to store user details
create table if not exists public.profiles (
  id uuid primary key default auth.uid(),
  full_name text,
  nickname text,
  whatsapp text,
  birth_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deactivated_at timestamptz
);

alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists nickname text;
alter table public.profiles add column if not exists whatsapp text;
alter table public.profiles add column if not exists birth_date date;
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();
alter table public.profiles add column if not exists deactivated_at timestamptz;

-- Unique nickname optional
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_nickname_unique'
  ) then
    alter table public.profiles add constraint profiles_nickname_unique unique (nickname);
  end if;
end $$;

-- Update updated_at on change
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'profiles_set_updated_at'
  ) then
    create trigger profiles_set_updated_at
    before update on public.profiles
    for each row execute function public.set_updated_at();
  end if;
end $$;

-- Enable RLS and policies
alter table public.profiles enable row level security;

-- Select own profile
do $$ begin
  if not exists (
    select 1 from pg_policies where policyname = 'profiles_select_own'
  ) then
    create policy profiles_select_own on public.profiles
      for select using (id = auth.uid());
  end if;
end $$;

-- Insert own profile
do $$ begin
  if not exists (
    select 1 from pg_policies where policyname = 'profiles_insert_own'
  ) then
    create policy profiles_insert_own on public.profiles
      for insert with check (id = auth.uid());
  end if;
end $$;

-- Update own profile
do $$ begin
  if not exists (
    select 1 from pg_policies where policyname = 'profiles_update_own'
  ) then
    create policy profiles_update_own on public.profiles
      for update using (id = auth.uid()) with check (id = auth.uid());
  end if;
end $$;

-- Delete own profile (optional; admin can still delete)
do $$ begin
  if not exists (
    select 1 from pg_policies where policyname = 'profiles_delete_own'
  ) then
    create policy profiles_delete_own on public.profiles
      for delete using (id = auth.uid());
  end if;
end $$;
