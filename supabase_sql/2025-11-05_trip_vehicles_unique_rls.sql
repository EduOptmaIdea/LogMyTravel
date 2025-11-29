-- Fortalecer integridade e RLS para vínculos veículo-viagem e segmentos
-- Execute este script no Supabase SQL Editor (projeto atual)

-- Garante índice único para (trip_id, vehicle_id) em trip_vehicles
create unique index if not exists uniq_tv_trip_vehicle on trip_vehicles (trip_id, vehicle_id);

-- Ativa RLS nas tabelas (se ainda não estiverem ativas)
alter table if exists trip_vehicles enable row level security;
alter table if exists trip_vehicle_segments enable row level security;

-- Remove políticas permissivas anteriores, se existirem
drop policy if exists "trip_vehicles_all" on trip_vehicles;
drop policy if exists "trip_vehicle_segments_all" on trip_vehicle_segments;

-- Políticas por usuário: só ver e alterar os próprios registros
drop policy if exists "tv_select_own" on trip_vehicles;
create policy "tv_select_own" on trip_vehicles
  for select
  using (user_id = auth.uid());

drop policy if exists "tv_insert_own" on trip_vehicles;
create policy "tv_insert_own" on trip_vehicles
  for insert
  with check (user_id = auth.uid());

drop policy if exists "tv_update_own" on trip_vehicles;
create policy "tv_update_own" on trip_vehicles
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "tv_delete_own" on trip_vehicles;
create policy "tv_delete_own" on trip_vehicles
  for delete
  using (user_id = auth.uid());

drop policy if exists "tvs_select_own" on trip_vehicle_segments;
create policy "tvs_select_own" on trip_vehicle_segments
  for select
  using (user_id = auth.uid());

drop policy if exists "tvs_insert_own" on trip_vehicle_segments;
create policy "tvs_insert_own" on trip_vehicle_segments
  for insert
  with check (user_id = auth.uid());

drop policy if exists "tvs_update_own" on trip_vehicle_segments;
create policy "tvs_update_own" on trip_vehicle_segments
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "tvs_delete_own" on trip_vehicle_segments;
create policy "tvs_delete_own" on trip_vehicle_segments
  for delete
  using (user_id = auth.uid());

-- Observação: o cliente deve sempre enviar user_id nas operações de escrita.
-- O app foi atualizado para usar user_id em inserts/updates/deletes.