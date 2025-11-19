-- ============================================================================
-- Migration: marketing consent audit fields
-- Filename: 20251116000015_marketing_consent_audit.sql
-- ============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS marketing_opt_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS marketing_opt_in_ip text,
  ADD COLUMN IF NOT EXISTS marketing_opt_source text;

-- marketing_opt_in column already exists (20251116000000_extend_users_profile)
-- keep it as the boolean source of truth.

-- ============================================================================
-- DOWN MIGRATION
-- ============================================================================

ALTER TABLE public.users
  DROP COLUMN IF EXISTS marketing_opt_source,
  DROP COLUMN IF EXISTS marketing_opt_in_ip,
  DROP COLUMN IF EXISTS marketing_opt_in_at;


