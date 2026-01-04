-- Move driving logic from trips to stops and add optional vehicle linkage
ALTER TABLE public.stops ADD COLUMN IF NOT EXISTS was_driving boolean DEFAULT false;
ALTER TABLE public.stops ADD COLUMN IF NOT EXISTS vehicle_id uuid NULL REFERENCES public.vehicles(id) ON DELETE SET NULL;
ALTER TABLE public.stops ADD COLUMN IF NOT EXISTS transport_mode text NULL;
ALTER TABLE public.stops ADD COLUMN IF NOT EXISTS estimated_distance_km numeric(10,1) NULL;
CREATE INDEX IF NOT EXISTS idx_stops_trip_dt ON public.stops(trip_id, arrival_date, arrival_time);

-- Optional: retain trips.is_driving but stop using it
ALTER TABLE public.trips ALTER COLUMN is_driving DROP DEFAULT;

-- RLS: ensure inserts/updates include user_id checks if policies are in place
-- Example policies (adjust to your schema):
-- CREATE POLICY stops_ins ON public.stops FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY stops_sel ON public.stops FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY stops_upd ON public.stops FOR UPDATE USING (auth.uid() = user_id);
-- CREATE POLICY stops_del ON public.stops FOR DELETE USING (auth.uid() = user_id);
