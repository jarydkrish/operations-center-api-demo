/*
  # Add preferred area unit to john_deere_connections

  1. Modified Tables
    - `john_deere_connections`
      - Added `preferred_area_unit` (text, default 'ac') - user's preferred unit for displaying field areas ('ac' for acres, 'ha' for hectares)

  2. Notes
    - Defaults to 'ac' (acres) for new and existing connections
    - Used for frontend display conversion only; stored field data remains in its original unit from John Deere
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'john_deere_connections' AND column_name = 'preferred_area_unit'
  ) THEN
    ALTER TABLE john_deere_connections ADD COLUMN preferred_area_unit text NOT NULL DEFAULT 'ac';
  END IF;
END $$;