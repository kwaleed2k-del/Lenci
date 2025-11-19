-- ============================================================================
-- Migration: email suppressions registry
-- Filename: 20251116000016_email_suppressions.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  reason text NOT NULL,
  source text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.email_suppressions IS 'deliverability_suppressions_mig';

CREATE UNIQUE INDEX IF NOT EXISTS email_suppressions_email_unique_idx
  ON public.email_suppressions (email);

CREATE INDEX IF NOT EXISTS email_suppressions_user_idx
  ON public.email_suppressions (user_id);

ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS email_supp_self_select
  ON public.email_suppressions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS email_supp_service_all
  ON public.email_suppressions FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- DOWN MIGRATION
-- ============================================================================
DROP POLICY IF EXISTS email_supp_service_all ON public.email_suppressions;
DROP POLICY IF EXISTS email_supp_self_select ON public.email_suppressions;
DROP INDEX IF EXISTS email_suppressions_user_idx;
DROP INDEX IF EXISTS email_suppressions_email_unique_idx;
DROP TABLE IF EXISTS public.email_suppressions;


