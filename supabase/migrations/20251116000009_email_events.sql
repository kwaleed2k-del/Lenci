-- ============================================================================
-- Migration: email_events table for transactional email idempotency and audit
-- Filename: 20251116000009_email_events.sql
-- ============================================================================

-- email_events: server-written audit for sent emails
CREATE TABLE IF NOT EXISTS public.email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type text NOT NULL,               -- 'welcome' | 'low_credit' | 'payment_failed'
  language text NOT NULL,           -- 'en' | 'ar'
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.email_events IS 'tx_emails_mig';

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

-- users can read their own logs
CREATE POLICY IF NOT EXISTS email_events_self_select
  ON public.email_events FOR SELECT USING (user_id = auth.uid());

-- service role can do anything
CREATE POLICY IF NOT EXISTS email_events_service_all
  ON public.email_events FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Idempotency guards:
-- Welcome: once per user
CREATE UNIQUE INDEX IF NOT EXISTS email_once_welcome_idx
  ON public.email_events(user_id)
  WHERE type = 'welcome';

-- Low credit: once per user per calendar day (UTC) to avoid spam
CREATE UNIQUE INDEX IF NOT EXISTS email_daily_low_credit_idx
  ON public.email_events(user_id, (date_trunc('day', created_at)))
  WHERE type = 'low_credit';

-- Payment failed: one per Stripe object id recorded in payload.stripe_object_id
CREATE UNIQUE INDEX IF NOT EXISTS email_unique_payment_failed_idx
  ON public.email_events((payload->>'stripe_object_id'))
  WHERE type = 'payment_failed' AND payload ? 'stripe_object_id';

-- ============================================================================
-- DOWN MIGRATION
-- ============================================================================
DROP INDEX IF EXISTS public.email_unique_payment_failed_idx;
DROP INDEX IF EXISTS public.email_daily_low_credit_idx;
DROP INDEX IF EXISTS public.email_once_welcome_idx;
DROP POLICY IF EXISTS email_events_service_all ON public.email_events;
DROP POLICY IF EXISTS email_events_self_select ON public.email_events;
DROP TABLE IF EXISTS public.email_events;

