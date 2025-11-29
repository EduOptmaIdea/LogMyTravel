-- Profiles table linked to Supabase Auth users (simple test setup)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table profiles enable row level security;

-- Allow users to manage their own profile only
create policy "Read own profile" on profiles
  for select using (auth.uid() = id);

create policy "Insert own profile" on profiles
  for insert with check (auth.uid() = id);

create policy "Update own profile" on profiles
  for update using (auth.uid() = id);

-- Optional: auto-create profile on signup (can be implemented via edge function or database trigger)
-- For quick tests, you can manually insert:
-- insert into profiles (id, email) values ('<USER_ID>', '<EMAIL>');