-- Atualizações de schema: armazenar estado "vai dirigir" e detalhes do veículo por viagem

-- 1) Adiciona coluna para persistir toggle "Vai dirigir" na tabela trips
alter table if exists trips
  add column if not exists is_driving boolean default false;

-- 2) Acrescenta campos de detalhes ao vínculo veículo-viagem
--    Usa a tabela existente trip_vehicles
alter table if exists trip_vehicles
  add column if not exists initial_km numeric(12,2),
  add column if not exists final_km numeric(12,2),
  add column if not exists notes text;

-- Índices úteis
create index if not exists idx_trips_is_driving on trips(is_driving);