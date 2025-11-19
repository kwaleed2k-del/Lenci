-- ============================================================================
-- Migration: Add low_credit_emails_enabled flag to auto_topup_settings
-- Filename: 20251116000013_auto_topup_notify_flag.sql
-- ============================================================================

ALTER TABLE public.auto_topup_settings
  ADD COLUMN IF NOT EXISTS low_credit_emails_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.auto_topup_settings.low_credit_emails_enabled IS 'Controls whether low-credit email alerts are sent (default: true)';

-- ============================================================================
-- DOWN MIGRATION
-- ============================================================================
ALTER TABLE public.auto_topup_settings
  DROP COLUMN IF EXISTS low_credit_emails_enabled;

