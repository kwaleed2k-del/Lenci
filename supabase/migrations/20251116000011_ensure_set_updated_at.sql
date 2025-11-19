-- ============================================================================
-- Safety migration: Ensure set_updated_at() function exists
-- Filename: 20251116000011_ensure_set_updated_at.sql
-- ============================================================================
-- This migration ensures set_updated_at() exists in case a previous rollback
-- accidentally dropped it. The function is used by multiple tables.

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

-- ============================================================================
-- DOWN MIGRATION
-- ============================================================================
-- Do not drop the function as it may be used by other tables

