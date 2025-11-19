-- ============================================================================
-- Migration: auto_topup_settings table for user auto top-up preferences
-- Filename: 20251116000010_auto_topup_settings.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.auto_topup_settings (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  price_id text,             -- must be in STRIPE_TOPUPS
  threshold integer NOT NULL DEFAULT 10, -- credits; clamp in server too
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.auto_topup_settings IS 'auto_topup_mig';

ALTER TABLE public.auto_topup_settings ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own row
CREATE POLICY IF NOT EXISTS auto_topup_self_select
  ON public.auto_topup_settings FOR SELECT USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS auto_topup_self_upsert
  ON public.auto_topup_settings FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS auto_topup_self_update
  ON public.auto_topup_settings FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Service role can do all
CREATE POLICY IF NOT EXISTS auto_topup_service_all
  ON public.auto_topup_settings FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS auto_topup_set_updated_at ON public.auto_topup_settings;
CREATE TRIGGER auto_topup_set_updated_at
  BEFORE UPDATE ON public.auto_topup_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- DOWN MIGRATION
-- ============================================================================
DROP TRIGGER IF EXISTS auto_topup_set_updated_at ON public.auto_topup_settings;
-- Note: Do not drop set_updated_at() function as it may be used by other tables
DROP POLICY IF EXISTS auto_topup_service_all ON public.auto_topup_settings;
DROP POLICY IF EXISTS auto_topup_self_update ON public.auto_topup_settings;
DROP POLICY IF EXISTS auto_topup_self_upsert ON public.auto_topup_settings;
DROP POLICY IF EXISTS auto_topup_self_select ON public.auto_topup_settings;
DROP TABLE IF EXISTS public.auto_topup_settings;

