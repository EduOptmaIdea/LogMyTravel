-- Base schema para LogMyTravel
-- Executar no SQL Editor do Supabase (projeto selecionado)

-- Extensões úteis
create extension if not exists pgcrypto;

-- Tabela de viagens
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  name text not null,
  departure_location text not null,
  departure_coords jsonb null,
  departure_date text not null,
  departure_time text not null,
  arrival_location text null,
  arrival_coords jsonb null,
  arrival_date text null,
  arrival_time text null,
  start_km numeric null,
  end_km numeric null,
  details text null,
  status text not null default 'ongoing',
  has_vehicle boolean default false,
  vehicle_ids text[] null,
  is_driving boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabela de veículos
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  nickname text not null,
  category text null,
  make text null,
  model text null,
  color text null,
  year int null,
  license_plate text null,
  vehicle_type text null,
  km_initial numeric null,
  fuels text[] null,
  photo_url text null,
  photo_path text null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabela de paradas
create table if not exists public.stops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  location jsonb null,
  arrival_km numeric null,
  departure_km numeric null,
  arrival_date text not null,
  arrival_time text not null,
  departure_date text null,
  departure_time text null,
  reasons text[] null,
  other_reason text null,
  cost numeric default 0,
  notes text null,
  photo_urls text[] null,
  created_at timestamptz default now()
);

-- Tabela de vinculação simples (opcional, usada por relatórios futuros)
create table if not exists public.trip_vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  trip_id uuid not null references public.trips(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  initial_km numeric null,
  final_km numeric null,
  notes text null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Segmentos de KM por veículo/viagem
create table if not exists public.trip_vehicle_segments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  trip_id uuid not null references public.trips(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  segment_date date not null,
  initial_km numeric not null,
  current_km numeric not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Índices
create index if not exists idx_trips_user on public.trips(user_id);
create index if not exists idx_vehicles_user on public.vehicles(user_id);
create index if not exists idx_stops_trip on public.stops(trip_id);
create index if not exists idx_trip_vehicles_trip on public.trip_vehicles(trip_id);
create index if not exists idx_trip_vehicle_segments_trip on public.trip_vehicle_segments(trip_id);
create index if not exists idx_trip_vehicle_segments_vehicle on public.trip_vehicle_segments(vehicle_id);

-- RLS: habilitar e liberar (ajuste fino depois)
alter table public.trips enable row level security;
alter table public.vehicles enable row level security;
alter table public.stops enable row level security;
alter table public.trip_vehicles enable row level security;
alter table public.trip_vehicle_segments enable row level security;

-- Políticas permissivas (temporárias): permitem tudo
-- Observação: CREATE POLICY não suporta IF NOT EXISTS. Use DROP + CREATE.
drop policy if exists "trips_all" on public.trips;
create policy "trips_all" on public.trips for all using (true) with check (true);

drop policy if exists "vehicles_all" on public.vehicles;
create policy "vehicles_all" on public.vehicles for all using (true) with check (true);

drop policy if exists "stops_all" on public.stops;
create policy "stops_all" on public.stops for all using (true) with check (true);

drop policy if exists "trip_vehicles_all" on public.trip_vehicles;
create policy "trip_vehicles_all" on public.trip_vehicles for all using (true) with check (true);

drop policy if exists "trip_vehicle_segments_all" on public.trip_vehicle_segments;
create policy "trip_vehicle_segments_all" on public.trip_vehicle_segments for all using (true) with check (true);

-- Observação: o bucket de Storage deve ser criado via interface
-- Nome sugerido: 'trip-photos'