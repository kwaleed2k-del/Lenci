-- ============================================================================
-- Migration: email_events indexes for admin log
-- Filename: 20251116000014_email_events_indexes.sql
-- ============================================================================

-- Speed up admin listing/filtering
CREATE INDEX IF NOT EXISTS email_events_created_idx ON public.email_events (created_at DESC);
CREATE INDEX IF NOT EXISTS email_events_type_idx ON public.email_events (type);

-- Optional: lightweight JSONB path ops to filter by payload keys
CREATE INDEX IF NOT EXISTS email_events_payload_gin ON public.email_events USING GIN (payload jsonb_path_ops);

-- ============================================================================
-- DOWN MIGRATION
-- ============================================================================
DROP INDEX IF EXISTS email_events_payload_gin;
DROP INDEX IF EXISTS email_events_type_idx;
DROP INDEX IF EXISTS email_events_created_idx;


