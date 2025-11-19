-- ============================================================================
-- Migration: email_jobs queue table
-- Filename: 20251116000017_email_jobs.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  to_email text NOT NULL,
  category text NOT NULL,
  template text NOT NULL,
  subject text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 6,
  last_error text,
  run_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS email_jobs_idem_unique_idx
  ON public.email_jobs (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS email_jobs_status_run_idx
  ON public.email_jobs (status, run_at);

ALTER TABLE public.email_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS email_jobs_self_select
  ON public.email_jobs FOR SELECT USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS email_jobs_service_all
  ON public.email_jobs FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.email_jobs_claim(p_limit int DEFAULT 50)
RETURNS SETOF public.email_jobs
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  WITH to_claim AS (
    SELECT id
    FROM public.email_jobs
    WHERE status = 'pending'
      AND run_at <= now()
    ORDER BY run_at ASC
    LIMIT COALESCE(p_limit, 50)
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.email_jobs j
  SET status = 'sending',
      last_error = NULL
  WHERE j.id IN (SELECT id FROM to_claim)
  RETURNING j.*;
END;
$$;

COMMENT ON FUNCTION public.email_jobs_claim(int) IS 'email_queue_claim_mig';

CREATE OR REPLACE FUNCTION public.email_jobs_set_retry(p_id uuid, p_attempts integer, p_run_at timestamptz, p_error text)
RETURNS VOID
LANGUAGE sql
AS $$
  UPDATE public.email_jobs
  SET status = 'pending',
      attempts = p_attempts,
      run_at = p_run_at,
      last_error = left(p_error, 1000)
  WHERE id = p_id;
$$;

-- ============================================================================
-- DOWN MIGRATION
-- ============================================================================
DROP POLICY IF EXISTS email_jobs_service_all ON public.email_jobs;
DROP POLICY IF EXISTS email_jobs_self_select ON public.email_jobs;
DROP FUNCTION IF EXISTS public.email_jobs_set_retry(uuid, integer, timestamptz, text);
DROP FUNCTION IF EXISTS public.email_jobs_claim(int);
DROP INDEX IF EXISTS email_jobs_status_run_idx;
DROP INDEX IF EXISTS email_jobs_idem_unique_idx;
DROP TABLE IF EXISTS public.email_jobs;


