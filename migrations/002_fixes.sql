-- ============================================================
-- Migration 002 : Corrections audit
-- ============================================================

-- 1. Fonction RPC atomique pour incrémenter tickets_sold
--    Empêche les race conditions et la survente
CREATE OR REPLACE FUNCTION increment_tickets_sold(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  rows_affected INT;
BEGIN
  UPDATE events
  SET tickets_sold = tickets_sold + 1
  WHERE id = p_event_id
    AND tickets_sold < capacity;

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$;

-- 2. Ajouter la colonne time à restaurant_reservations si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurant_reservations' AND column_name = 'time'
  ) THEN
    ALTER TABLE restaurant_reservations ADD COLUMN time TEXT;
  END IF;
END $$;
