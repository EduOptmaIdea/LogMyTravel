-- Evolve stops schema for Stops Management and enforce RLS via trip ownership
-- Idempotent changes: safe re-run without errors

-- 1) Columns for feature
ALTER TABLE IF EXISTS stops
  ADD COLUMN IF NOT EXISTS stop_type text NOT NULL DEFAULT 'stop',
  ADD COLUMN IF NOT EXISTS was_driving boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS place text,
  ADD COLUMN IF NOT EXISTS place_detail text;

-- Optional CHECK for stop_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'stops_stop_type_check'
  ) THEN
    ALTER TABLE stops
    ADD CONSTRAINT stops_stop_type_check CHECK (stop_type IN ('stop','destination'));
  END IF;
END $$;

-- 2) Enable RLS and replace permissive policies
ALTER TABLE IF EXISTS stops ENABLE ROW LEVEL SECURITY;

-- Drop legacy permissive policies if present
DROP POLICY IF EXISTS "Permitir leitura pública" ON stops;
DROP POLICY IF EXISTS "Permitir inserção pública" ON stops;
DROP POLICY IF EXISTS "Permitir atualização pública" ON stops;
DROP POLICY IF EXISTS "Permitir exclusão pública" ON stops;

-- Helper predicate: stop belongs to a trip owned by current user
-- Note: Works whether stops has user_id or not, as it references trips.user_id

-- SELECT
DROP POLICY IF EXISTS stops_select_own ON stops;
CREATE POLICY stops_select_own ON stops FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = stops.trip_id AND t.user_id = auth.uid()
  )
);

-- INSERT
DROP POLICY IF EXISTS stops_insert_own ON stops;
CREATE POLICY stops_insert_own ON stops FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = stops.trip_id AND t.user_id = auth.uid()
  )
);

-- UPDATE
DROP POLICY IF EXISTS stops_update_own ON stops;
CREATE POLICY stops_update_own ON stops FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = stops.trip_id AND t.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = stops.trip_id AND t.user_id = auth.uid()
  )
);

-- DELETE
DROP POLICY IF EXISTS stops_delete_own ON stops;
CREATE POLICY stops_delete_own ON stops FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = stops.trip_id AND t.user_id = auth.uid()
  )
);

-- 3) Make updated_at trigger consistent (if function exists)
-- This is safe; if the trigger already exists it ensures it’s in place
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    DROP TRIGGER IF EXISTS update_stops_updated_at ON stops;
    CREATE TRIGGER update_stops_updated_at BEFORE UPDATE ON stops
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;