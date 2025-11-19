-- ============================================================================
-- Migration: Unique index for topup receipt emails (idempotency)
-- Filename: 20251116000012_email_topup_receipt_idx.sql
-- ============================================================================

-- Unique-by-stripe_object for topup receipt emails (same pattern as payment_failed)
CREATE UNIQUE INDEX IF NOT EXISTS email_unique_topup_receipt_idx
  ON public.email_events ((payload->>'stripe_object_id'))
  WHERE type = 'topup_receipt' AND payload ? 'stripe_object_id';

-- ============================================================================
-- DOWN MIGRATION
-- ============================================================================
DROP INDEX IF EXISTS email_unique_topup_receipt_idx;

