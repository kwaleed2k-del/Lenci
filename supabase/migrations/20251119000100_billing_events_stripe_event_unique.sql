-- Ensure stripe_event_id uniqueness on billing_events without breaking existing data.

-- 01) Drop existing unique index if it exists
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM pg_indexes
		WHERE schemaname = 'public'
			AND indexname = 'ux_billing_events_stripe_event_id'
	) THEN
		EXECUTE 'DROP INDEX public.ux_billing_events_stripe_event_id';
	END IF;
END $$;

-- 02) Delete duplicates while keeping the earliest row per stripe_event_id
DELETE FROM billing_events be
USING billing_events be2
WHERE be.stripe_event_id IS NOT NULL
	AND be2.stripe_event_id = be.stripe_event_id
	AND be2.created_at < be.created_at;

-- 03) Create partial unique index on non-null stripe_event_id values
CREATE UNIQUE INDEX ux_billing_events_stripe_event_id
	ON billing_events (stripe_event_id)
	WHERE stripe_event_id IS NOT NULL;


