-- Adiciona coluna para guardar gastos categorizados por parada
-- Use no Supabase SQL Editor ou cliente psql para aplicar

ALTER TABLE IF EXISTS public.stops
  ADD COLUMN IF NOT EXISTS cost_details jsonb NULL;

-- Opcional: índice GIN para consultas futuras por categoria/nota
-- CREATE INDEX IF NOT EXISTS idx_stops_cost_details ON public.stops USING GIN (cost_details);

