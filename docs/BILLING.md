# Billing & Credits

## Plans & Features

| Plan | Monthly credits | API access | Watermarking |
| --- | --- | --- | --- |
| Free | 10 | ❌ | ✅ (all assets) |
| Starter | 100 | ❌ | ❌ |
| Professional | 500 | ✅ | ❌ |
| Enterprise | Unlimited | ✅ | ❌ |

Credits top up automatically via the monthly grant job (see below). Enterprise is handled via Stripe + manual provisioning.

## Monthly Grant Job

- Each user receives `monthly_grant` credit transactions based on their plan.
- Uniqueness guard: `credit_tx_monthly_unique_idx` on `(user_id, metadata->>'period') WHERE reason='monthly_grant'`.
- Admin endpoint: `POST /api/admin/run-monthly-grant?period=YYYY-MM&dry=1` (requires `x-cron-secret` header).
- Automations:
  - Supabase Edge Function `cron-monthly-grant` POSTs to `ADMIN_GRANT_URL`.
  - Supabase Cron (config in `supabase/config.toml`) runs on the 1st of each month.
  - Summary payload is logged to `billing_events` (`type: monthly_grant_run`).
- Manual run: `npm run ops:grant -- 2025-11 --dry` (`CRON_SECRET` + `ADMIN_GRANT_URL` must be set).

## Stripe Integration

- Checkout subscriptions via `/api/stripe/checkout` using price IDs (`STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PROFESSIONAL`).
- Customer portal via `/api/stripe/portal`.
- Webhook `/api/stripe/webhook` verifies signatures (uses `STRIPE_WEBHOOK_SECRET`) and:
  - Logs `billing_events` (deduped by `billing_events_stripe_unique_idx` on `stripe_object_id`).
  - Normalizes `public.subscriptions` so only one row per user is `active|trialing|past_due`.
- Invoice history surfaces `stripe.invoices.list` results through `/api/billing/invoices`.

## Watermarking

- `shouldWatermark(userId)` checks plan features.
- `attachWatermarkFlag` middleware adds `X-Watermarked` header and ensures generated assets append/preserve watermarks when required.
- Image pipeline uses `applyWatermarkIfRequired` (Sharp optional; no-op if missing).

## Emails

Transactional emails are provider-agnostic and support English (EN) and Arabic (AR) templates based on `users.locale` (defaults to 'en').

### Provider Configuration

Set `EMAIL_PROVIDER` to one of:
- `console` (default) - logs to console in development
- `resend` - requires `RESEND_API_KEY`
- `mailersend` - requires `MAILERSEND_API_KEY`

Required: `FROM_EMAIL` (sender address).

### Email Types & Triggers

1. **Welcome** (`welcome`)
   - Triggered automatically on signup via the Supabase Edge Function `auth-welcome` (wire it to Supabase Auth webhooks `user.created`, sending `{ "user_id": "<uuid>" }` with header `x-hook-secret: HOOK_SECRET`).
   - Backfill: Hourly cron `cron-welcome-backfill` scans the last 24h for users missing a welcome email and sends it (idempotent).
   - Idempotency: Once per user (unique index on `user_id` where `type='welcome'` keeps the Edge Function + cron safe to retry).
   - Dev route: `POST /api/dev/send-welcome` (non-production only) to manually test as the signed-in user.
   - Env: set `HOOK_SECRET` (for `auth-welcome`) and `CRON_SECRET` (shared by cron functions) in both local `.env` and your Supabase project env so the hooks stay private.

2. **Low Credit** (`low_credit`)
   - Triggered: Automatically after `recordUsageEvent` when new balance < threshold.
   - Idempotency: Once per user per calendar day (UTC) to avoid spam.
   - Threshold: Per-user configurable value from `auto_topup_settings.threshold` (default 10 credits).
   - Email Preference: Controlled by `auto_topup_settings.low_credit_emails_enabled` (default: true). When disabled, low-credit emails are not sent, but the visual banner still appears based on threshold.
   - The threshold is the same value used for Auto Top-Up and Low-credit banner, editable on `/billing` in the "Low-credit Alerts" section.
   - Users receive at most one email per UTC day when balance falls below their configured threshold (only if `low_credit_emails_enabled` is true).
   - **Note**: Other transactional emails (receipts, payment failed, welcome) are unaffected by this preference toggle.

3. **Payment Failed** (`payment_failed`)
   - Triggered: Stripe webhook `invoice.payment_failed` event.
   - Idempotency: Once per Stripe invoice ID (unique index on `payload->>'stripe_object_id'`).

### Idempotency & Audit

All emails are logged to `public.email_events` table:
- `user_id`, `type`, `language`, `payload` (JSONB), `created_at`
- RLS: Users can read their own logs; service role has full access.
- Unique indexes prevent duplicate sends per trigger type.

Email sending is best-effort: failures are logged but don't break the main request flow.

## Top-Ups

One-time credit purchases via Stripe Checkout (mode: payment).

### Configuration

Set `STRIPE_TOPUPS` environment variable to map Stripe Price IDs to credit amounts:

```
STRIPE_TOPUPS=price_123abc:100,price_456def:500,price_789ghi:2000
```

Format: `price_id:credits,price_id:credits,...`

- Each price ID must exist in your Stripe account.
- Credits must be positive integers.
- Order in env determines display order in UI.

### Endpoints

- `GET /api/billing/topup/options` (cookie-auth)
  - Returns configured top-up options with pricing from Stripe.
  - Empty array if `STRIPE_TOPUPS` unset or no matching prices found.

- `POST /api/stripe/topup/checkout` (cookie-auth)
  - Body: `{ priceId, successUrl, cancelUrl }`
  - Validates `priceId` against config.
  - Creates Stripe Checkout Session (mode: payment, metadata: `{ kind: 'topup', user_id }`).
  - Returns `{ url }` for redirect.

### Webhook Processing

On `checkout.session.completed` (mode: payment, metadata.kind: 'topup'):

1. Resolves `userId` from session metadata or customer lookup.
2. Fetches line items to get `priceId`.
3. Looks up credits via `creditsForPrice(priceId)`.
4. Idempotently inserts `billing_events` row (unique index on `stripe_object_id` prevents duplicates).
5. Grants credits via `grant_credits(userId, credits, 'topup', { price_id, session_id })`.

### Credit Transactions

Top-ups create `credit_transactions` rows with:
- `delta`: positive credit amount
- `reason`: `'topup'`
- `metadata`: `{ price_id, session_id }`

### UI

`/billing` page displays "Buy Credits" section when top-ups are configured:
- Lists available options with labels and prices.
- "Buy" button starts checkout flow.
- Success redirect (`?purchase=success`) shows toast and auto-refreshes balance/history.
- Cancel redirect (`?purchase=cancel`) silently returns to billing page.

## Auto Top-Up

Automatic credit purchases when balance drops below a user-configured threshold.

### Settings Schema

`public.auto_topup_settings` table stores per-user preferences:
- `user_id` (PK, references users)
- `enabled` (boolean, default false)
- `price_id` (text, must be in `STRIPE_TOPUPS`)
- `threshold` (integer, 1-10000 credits, default 10)
- `updated_at` (timestamptz, auto-updated)

RLS: Users can read/update their own row; service role has full access.

### How It Works

1. **User Configuration**: User enables auto top-up on `/billing`, selects a top-up option (from `STRIPE_TOPUPS`), and sets a threshold.

2. **Trigger**: After `recordUsageEvent()` when `newBalance < threshold`:
   - Checks if auto top-up is enabled and configured.
   - Verifies customer has a default payment method in Stripe.
   - Prevents rapid duplicate charges (checks for recent `topup_auto` events in last 10 minutes).

3. **Charge**: Creates and confirms Stripe PaymentIntent off-session:
   - Uses customer's default payment method.
   - Amount/currency from selected price.
   - Metadata: `{ kind: 'topup_auto', user_id, price_id }`.

4. **Credit Grant**: Idempotently:
   - Inserts `billing_events` row (type: `topup_auto`, unique on `stripe_object_id`).
   - Calls `grant_credits(userId, credits, 'topup_auto', { price_id, payment_intent_id })`.

### Webhook Safety Net

- `payment_intent.succeeded` (metadata.kind='topup_auto'):
  - Logs event and grants credits if not already processed (idempotent via unique `stripe_object_id`).
  - Handles cases where PaymentIntent succeeds but server-side grant didn't complete.

- `payment_intent.payment_failed` (metadata.kind='topup_auto'):
  - Logs failure event (`type: topup_auto_failed`).
  - Optionally sends payment failed email (does not block generation).

### Failure Behavior

- **No payment method**: Service returns `'no_payment_method'`; UI suggests adding one via Stripe Portal.
- **Payment fails**: Logged to `billing_events`, email sent (if configured), but generation continues.
- **Rapid triggers**: 10-minute cooldown prevents duplicate charges for same user.

### Credit Transactions

Auto top-ups create `credit_transactions` rows with:
- `delta`: positive credit amount
- `reason`: `'topup_auto'`
- `metadata`: `{ price_id, payment_intent_id }`

### UI

`/billing` page includes "Auto Top-Up" section:
- Toggle to enable/disable.
- Dropdown to select from configured top-up options.
- Number input for threshold (1-10000).
- "Save" button to persist settings.
- Link to Stripe Portal for adding payment methods.
- Info message showing when auto top-up will trigger.

## Top-Up Receipts & Purchases

Receipt emails and purchase history for credit top-ups (manual and auto).

### Receipt Emails

**Trigger**: Sent automatically after successful top-up (manual checkout or auto top-up).

**Idempotency**: Unique index on `email_events` (`email_unique_topup_receipt_idx`) ensures one email per Stripe object (session ID or payment intent ID).

**Templates**: EN/AR templates (`topupReceipt.en.ts`, `topupReceipt.ar.ts`) include:
- Credits purchased
- Amount & currency (if available)
- "View receipt" link (when Stripe receipt URL available)
- "Manage billing" link

**Data Captured**: Webhook handlers enrich `billing_events` payload with:
- `amount_cents`: Payment amount in cents
- `currency`: Payment currency (e.g., 'usd')
- `receipt_url`: Stripe receipt URL (from Charge object)
- `credits`: Number of credits granted
- `price_id`: Stripe Price ID used

### Purchases History

**API**: `GET /api/billing/purchases?days=30&limit=50` (cookie-auth)

- `days`: 7-365 (default 30) - time range in days
- `limit`: 10-200 (default 50) - max results
- Returns: `{ from, to, purchases: Array<{ at, kind, credits, amountCents, currency, receiptUrl }> }`
- Sources from `billing_events` where `type IN ('topup', 'topup_auto')`
- Ordered by `created_at DESC`

**UI**: `/billing` page includes "Purchases" table:
- Columns: Date, Type (Manual/Auto), Credits, Amount, Receipt
- Empty state: "Top-ups you buy appear here."
- Receipt links open Stripe receipt in new tab

### Webhook Processing

**Manual Top-Up** (`checkout.session.completed`, mode: payment, kind: topup):
1. Fetch PaymentIntent and Charge to get amount, currency, receipt_url
2. Enrich `billing_events` payload with receipt details
3. Grant credits
4. Send receipt email (idempotent)

**Auto Top-Up** (`payment_intent.succeeded`, metadata.kind: topup_auto):
1. Expand PaymentIntent with latest_charge
2. Extract amount, currency, receipt_url
3. Enrich `billing_events` payload
4. Grant credits (if not already granted)
5. Send receipt email (idempotent)

### Constraints

- Amount/currency may be null in rare cases (handled gracefully)
- Receipt URL only available after Charge is created (may be null for some payment methods)
- Email sending is best-effort (failures logged but don't block webhook processing)

## Marketing Preferences & Consent Audit

- Fields on `public.users`:
  - `marketing_opt_in` (boolean, default false) – source of truth for marketing consent
  - `marketing_opt_in_at` (timestamp) – when the user opted in
  - `marketing_opt_in_ip` (text) – IP captured at opt-in (not cleared on opt-out)
  - `marketing_opt_source` (text) – where consent was set (e.g., `'profile'`, `'onboarding'`, `'import'`)
- Opting in via `/billing` → “Marketing Preferences” sets the boolean, timestamp, IP (via `req.ip`/`x-forwarded-for`), and source (defaults to `'profile'`).
- Opting out sets `marketing_opt_in=false` but preserves historical audit fields for compliance.
- API:
  - `GET /api/me` → `{ marketingOptIn, marketingOptInAt, marketingOptInSource }`
  - `POST /api/me` body `{ marketingOptIn?: boolean }` enables/disables consent with audit logic. Responses include the same fields. All responses `Cache-Control: no-store`.
- Hook/UI: `useMe()` powers the toggle on `/billing`, showing opt-in timestamps when available.
- Marketing templates live under `src/server/emails/templates/marketing/` (placeholders for future campaigns) with footers linking to `/billing` (“Manage preferences”) and “Why you received this”.
- Transactional emails (welcome, receipts, payment failed, low-credit alerts toggle) are unaffected by marketing consent changes.

### Marketing Unsubscribe (List-Unsubscribe & One-Click)

- Stateless tokens: `makeUnsubToken(userId)` signs `{ uid, ts }` using `EMAIL_UNSUB_SECRET` (HMAC SHA-256, base64url). Tokens expire after 1 year.
- Headers for marketing sends (`marketingHeaders(userId)`):
  - `List-Unsubscribe: <https://app/api/email/unsubscribe?token=...>`
  - `List-Unsubscribe-Post: List-Unsubscribe=One-Click`
- Endpoints (no cookies required, token-gated):
  - `GET /api/email/unsubscribe?token=...` → renders a confirmation page + flips `marketing_opt_in=false`.
  - `POST /api/email/unsubscribe` with header `List-Unsubscribe: One-Click` and body `{ token }` → 204 No Content, idempotent.
- Marketing templates include a visible “Unsubscribe” link that uses the same token URL.
- Transactional emails ignore these headers/toggles and continue delivering receipts, payment failed, welcome, and low-credit notifications.

## Deliverability Webhooks & Suppression List

- Table: `public.email_suppressions`
  - Tracks `email`, optional `user_id`, `reason` (`hard_bounce`, `spam_complaint`, `provider_unsub`, `manual`), `source` (`resend`, `mailersend`, `admin`, `system`), `details` (raw JSON), `created_at`.
  - Unique per normalized email (stored lowercase). RLS: users can see their own rows; service role/admin API can read/write.
- Provider webhooks (secret-gated via `EMAIL_WEBHOOK_SECRET`):
  - `POST /api/email/webhooks/resend` (JSON body from Resend) → maps event types:
    - `email.bounced` → `hard_bounce`
    - `email.complained` → `spam_complaint`
    - `email.unsubscribed` → `provider_unsub`
  - `POST /api/email/webhooks/mailersend` → handles `hard_bounce/soft_bounce`, `spam_complaint`, `unsubscribe`.
  - Both endpoints upsert into `email_suppressions` (idempotent via unique index). Responses `Cache-Control: no-store`.
- Gating: `canSendMarketing(userId, email)` returns false if the user lacks consent or the email exists in `email_suppressions`. Transactional sends bypass this gate (they may still hard-bounce at the provider).
- Admin UI (`/admin/suppressions`) + API:
  - `GET /api/admin/suppressions` with filters (email/reason/source/days, cursor pagination).
  - `DELETE /api/admin/suppressions/:id` removes an entry after the address is verified.
  - Use this workflow to re-enable marketing for users who confirm their mailbox is fixed.
- Secrets:
  - `EMAIL_WEBHOOK_SECRET` for provider webhooks.
  - Continue using `EMAIL_UNSUB_SECRET`, `HOOK_SECRET`, `CRON_SECRET` for unsubscribe/auth-welcome flows.

- **Email queue & retries** (see `email_jobs`):
  - App code enqueues jobs via `enqueueEmail` with optional `idempotency_key` (e.g., `welcome:user_id`, `low_credit:user_id:YYYY-MM-DD`, `receipt:stripe_object_id`) to guarantee “at most once” when workers retry.
  - Jobs transition through statuses: `pending → sending → sent/dead`. Failures call `markRetry`, which increases `attempts`, schedules a future `run_at` using `nextRunAt` (5m exponential backoff capped at 6h), and keeps `last_error` truncated to 1k chars.
  - Provider failures are retried across alternate providers (handled in the worker in the next step).
  - Admins can manually trigger a processing tick via `POST /api/admin/email-jobs/tick?limit=50` (guarded by `x-cron-secret`) to run the worker loop once; response includes `{ processed, sent, retried, dead }`.
  - Use `/api/admin/email-jobs` UI to filter jobs by status/template/email, view errors, and manually retry or delete dead jobs.

## Admin Email Log & Previews

Admins can audit all transactional emails via `/api/admin/emails` (JSON) and `/api/admin/emails.csv` (CSV). Filters:

- `type`: `welcome` | `low_credit` | `payment_failed` | `topup_receipt`
- `userId`: exact match
- `days`: 1–365 (default 30)
- `limit`: 10–200 (CSV up to 500)
- `cursor`: ISO timestamp for keyset pagination

CSV exports include normalized columns (`amount_cents`, `currency`, `credits`, `stripe_object_id`, `receipt_url`) derived from `email_events.payload`.

Admin UI (`/admin/email-log`) surfaces these endpoints with filters, pagination, CSV export, and a “Preview” action.

`/api/admin/email-preview` safely renders templates (EN/AR) without sending or inserting `email_events`. It requires admin auth and optional parameters (amount, credits, etc.) depending on the template. Low-credit alerts respect user preferences (`low_credit_emails_enabled`), but previews ignore preferences to render the template.

Security: all endpoints require admin privileges (`requireAdmin`). Previews do not trigger email sends, keeping idempotency guarantees intact.


