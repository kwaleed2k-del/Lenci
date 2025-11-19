import 'dotenv/config';

/**
 * Express server for API endpoints.
 * Runs on process.env.API_PORT || 8787.
 * Server-only; requires SUPABASE_SERVICE_ROLE_KEY for admin operations.
 */
import express from 'express';
import cookieParser from 'cookie-parser';
import Stripe from 'stripe';
import { pathToFileURL } from 'url';
import { getSessionUser, UnauthenticatedError } from '../auth/expressAuth';
import { getBalance } from '../services/creditService';
import { getPlanSnapshot, getEffectivePlanCode, shouldWatermark } from '../services/subscriptionService';
import { runMonthlyGrantForAllUsers } from '../services/monthlyGrantService';
import { requireApiAccess, attachPlanCode, rateLimitByPlan } from '../middleware/planGate';
import { authenticateApiKey } from '../middleware/apiKeyAuth';
import { requireAdmin } from '../middleware/requireAdmin';
import { requireSessionApiAccess } from '../middleware/sessionApiAccess';
import {
	createCheckoutSession,
	createBillingPortalSession,
	verifyStripeSignature,
	stripe,
	ensureStripeCustomer
} from '../services/stripeService';
import { mapStripeSub, normalizeUserSubscriptions } from '../services/subscriptionNormalize';
import { createKeyForUser, listKeys, revokeKey } from '../services/apiKeyService';
import { attachWatermarkFlag } from '../middleware/watermarkFlag';
import { applyWatermarkIfRequired } from '../services/watermarkService';
import { costOf } from '../config/costs';
import { newRequestId, recordUsageEvent } from '../services/usageService';
import { SCOPES } from '../config/scopes';
import { admin } from '../supabaseAdmin';
import {
	sendWelcome,
	maybeNotifyLowCredit,
	sendPaymentFailed,
	sendTopupReceipt,
	renderEmailPreview,
	EmailPreviewKind
} from '../services/emailService';
import { listTopupOptions, isConfiguredPrice, creditsForPrice } from '../config/stripeTopups';
import { grant as grantCredits } from '../services/creditService';
import { getSettings as getAutoTopupSettings, upsertSettings, maybeAutoTopup } from '../services/autoTopupService';
import { getConsent, setConsent } from '../services/marketingConsent';
import { parseUnsubToken } from '../services/unsubToken';

const EMAIL_WEBHOOK_SECRET = process.env.EMAIL_WEBHOOK_SECRET;
const EMAIL_EVENT_TYPES = new Set(['welcome', 'low_credit', 'payment_failed', 'topup_receipt']);
const SUPPRESSION_REASON_MAP = {
	resend: {
		'email.bounced': 'hard_bounce',
		'email.complained': 'spam_complaint',
		'email.unsubscribed': 'provider_unsub'
	},
	mailersend: {
		'hard_bounce': 'hard_bounce',
		'soft_bounce': 'hard_bounce',
		'spam_complaint': 'spam_complaint',
		'unsubscribe': 'provider_unsub'
	}
} as const;

function getQueryString(value: unknown): string | null {
	if (Array.isArray(value)) {
		return value.length ? getQueryString(value[0]) : null;
	}
	if (typeof value === 'number' && Number.isFinite(value)) {
		return String(value);
	}
	if (typeof value === 'string') {
		const trimmed = value.trim();
		return trimmed.length ? trimmed : null;
	}
	return null;
}

function parseNumberParam(value: unknown): number | null {
	const str = getQueryString(value);
	if (!str) return null;
	const num = Number(str);
	return Number.isFinite(num) ? num : null;
}

function parseCursorParam(value: unknown): string | null {
	const str = getQueryString(value);
	if (!str) return null;
	return Number.isNaN(Date.parse(str)) ? null : str;
}

function getClientIp(req: express.Request): string | null {
	const header = req.headers['x-forwarded-for'];
	if (typeof header === 'string' && header.length > 0) {
		return header.split(',')[0].trim();
	}
	if (Array.isArray(header) && header.length > 0) {
		return header[0];
	}
	return req.ip || req.socket.remoteAddress || null;
}

function normalizeEmail(value: string): string {
	return value.trim().toLowerCase();
}

type SuppressionEvent = {
	email: string;
	userId: string | null;
	reason: string;
	source: string;
	details: unknown;
};

async function upsertSuppression(event: SuppressionEvent): Promise<void> {
	const email = normalizeEmail(event.email);
	if (!email) return;
	await admin
		.from('email_suppressions')
		.upsert(
			{
				email,
				user_id: event.userId ?? null,
				reason: event.reason,
				source: event.source,
				details: event.details ?? {}
			},
			{
				onConflict: 'email',
				ignoreDuplicates: true
			}
		);
}

function extractSuppressionUserId(metadata: Record<string, unknown> | undefined): string | null {
	if (!metadata) return null;
	const candidates = [
		metadata.user_id,
		metadata.userId,
		metadata['user-id'],
		metadata['userID']
	];
	for (const candidate of candidates) {
		if (typeof candidate === 'string' && candidate.length > 0) {
			return candidate;
		}
	}
	return null;
}

function normalizeResendEvent(payload: any): SuppressionEvent | null {
	const type = payload?.type;
	const map = SUPPRESSION_REASON_MAP.resend as Record<string, string>;
	const reason = type && map[type];
	const email = payload?.data?.email || payload?.email || payload?.to;
	if (!reason || typeof email !== 'string') return null;
	const userId = extractSuppressionUserId(payload?.data?.metadata);
	return {
		email,
		userId,
		reason,
		source: 'resend',
		details: payload
	};
}

function normalizeMailerSendEvents(payload: any): SuppressionEvent[] {
	const events = Array.isArray(payload?.events)
		? payload.events
		: Array.isArray(payload)
		? payload
		: [payload];
	const map = SUPPRESSION_REASON_MAP.mailersend as Record<string, string>;
	const out: SuppressionEvent[] = [];
	for (const entry of events) {
		const type = entry?.event || entry?.type;
		const reason = type && map[type];
		const email =
			entry?.email ||
			entry?.recipient ||
			entry?.data?.email ||
			entry?.data?.recipient;
		if (!reason || typeof email !== 'string') continue;
		out.push({
			email,
			userId: extractSuppressionUserId(entry?.metadata),
			reason,
			source: 'mailersend',
			details: entry
		});
	}
	return out;
}

function assertWebhookSecret(req: express.Request): void {
	if (!EMAIL_WEBHOOK_SECRET) {
		throw new UnauthenticatedError('webhook_secret_not_configured');
	}
	const provided = req.headers['x-provider-secret'];
	if (
		(typeof provided === 'string' && provided === EMAIL_WEBHOOK_SECRET) ||
		(Array.isArray(provided) && provided[0] === EMAIL_WEBHOOK_SECRET)
	) {
		return;
	}
	throw new UnauthenticatedError('invalid_webhook_secret');
}

function parseRawJson(req: express.Request): any {
	try {
		if (Buffer.isBuffer(req.body)) {
			const raw = req.body.toString('utf8');
			return raw ? JSON.parse(raw) : {};
		}
		if (typeof req.body === 'string') {
			return req.body ? JSON.parse(req.body) : {};
		}
		return req.body ?? {};
	} catch {
		throw new Error('invalid_json');
	}
}

export const app = express();
const PORT = Number.parseInt(process.env.API_PORT ?? '8787', 10);
const isDirectRun =
	typeof process.argv[1] === 'string' &&
	import.meta.url === pathToFileURL(process.argv[1]).href;

// Middleware
app.use(cookieParser());

// Stripe webhook must read the raw body
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
	try {
		const event = verifyStripeSignature(req);
		const payload = serializeStripeData(event.data);
		const userId = await resolveUserIdFromEvent(payload);

		const { error } = await admin.from('billing_events').insert({
			type: event.type,
			stripe_object_id: event.id,
			user_id: userId,
			payload
		});

		if (error) {
			if (error.message?.includes('billing_events_stripe_unique_idx')) {
				return res.sendStatus(200);
			}
			throw error;
		}

		await handleStripeEvent(event.type, payload, userId);
		res.sendStatus(200);
	} catch (e: unknown) {
		const err = e as { message?: string };
		console.error('Stripe webhook error', err);
		res.status(400).json({ error: String(err?.message ?? e ?? 'Webhook error') });
	}
});

app.post('/api/email/webhooks/resend', express.raw({ type: 'application/json' }), async (req, res) => {
	try {
		assertWebhookSecret(req);
		const payload = parseRawJson(req);
		const event = normalizeResendEvent(payload);
		if (event) {
			await upsertSuppression(event);
		}
		res.setHeader('Cache-Control', 'no-store');
		return res.json({ ok: true, processed: event ? 1 : 0 });
	} catch (e: unknown) {
		const err = e as { message?: string };
		if (err instanceof UnauthenticatedError) {
			return res.status(401).json({ error: 'unauthorized' });
		}
		const message = err?.message ?? 'invalid_payload';
		const status = message === 'invalid_json' ? 400 : 500;
		return res.status(status).json({ error: 'invalid_payload' });
	}
});

app.post('/api/email/webhooks/mailersend', express.raw({ type: 'application/json' }), async (req, res) => {
	try {
		assertWebhookSecret(req);
		const payload = parseRawJson(req);
		const events = normalizeMailerSendEvents(payload);
		for (const event of events) {
			await upsertSuppression(event);
		}
		res.setHeader('Cache-Control', 'no-store');
		return res.json({ ok: true, processed: events.length });
	} catch (e: unknown) {
		const err = e as { message?: string };
		if (err instanceof UnauthenticatedError) {
			return res.status(401).json({ error: 'unauthorized' });
		}
		const message = err?.message ?? 'invalid_payload';
		const status = message === 'invalid_json' ? 400 : 500;
		return res.status(status).json({ error: 'invalid_payload' });
	}
});

app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/api/health', (_req, res) => {
	res.json({ ok: true });
});

app.get('/api/me', async (req, res) => {
	try {
		const sessionUser = await getSessionUser(req, res);
		const { data, error } = await admin
			.from('users')
			.select('id, email, display_name, marketing_opt_in, marketing_opt_in_at, marketing_opt_source')
			.eq('id', sessionUser.id)
			.single();
		if (error || !data) {
			throw new Error(error?.message ?? 'user_not_found');
		}

		res.setHeader('Cache-Control', 'no-store');
		return res.json({
			id: data.id,
			email: data.email,
			displayName: data.display_name,
			marketingOptIn: Boolean(data.marketing_opt_in),
			marketingOptInAt: data.marketing_opt_in_at,
			marketingOptInSource: data.marketing_opt_source
		});
	} catch (e: unknown) {
		const err = e as { message?: string };
		const msg = String(err?.message ?? e ?? 'internal_error');
		if (msg.includes('UNAUTHENTICATED')) {
			return res.status(401).json({ error: 'unauthenticated' });
		}
		res.status(500).json({ error: 'internal_error' });
	}
});

app.post('/api/me', async (req, res) => {
	try {
		const sessionUser = await getSessionUser(req, res);
		const { marketingOptIn } = req.body ?? {};
		let consent = null;
		if (typeof marketingOptIn === 'boolean') {
			consent = await setConsent(sessionUser.id, {
				marketingOptIn,
				source: 'profile',
				ip: getClientIp(req) ?? undefined
			});
		}

		if (!consent) {
			consent = await getConsent(sessionUser.id);
		}

		res.setHeader('Cache-Control', 'no-store');
		return res.json({
			ok: true,
			marketingOptIn: consent.marketingOptIn,
			marketingOptInAt: consent.marketingOptInAt,
			marketingOptInSource: consent.marketingOptInSource
		});
	} catch (e: unknown) {
		const err = e as { message?: string };
		const msg = String(err?.message ?? e ?? 'internal_error');
		if (msg.includes('UNAUTHENTICATED')) {
			return res.status(401).json({ error: 'unauthenticated' });
		}
		res.status(500).json({ error: 'internal_error' });
	}
});

function unsubscribeHtmlMessage(message: string): string {
	return `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<title>Manage email preferences</title>
	<style>
		body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #0b0b0f; color: #f4f4f5; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; }
		.card { background:#18181b; border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:32px; width:90%; max-width:420px; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,0.5); }
		a { color:#a78bfa; text-decoration:none; }
	</style>
</head>
<body>
	<div class="card">
		<h1 style="margin-top:0;">Email preferences</h1>
		<p>${message}</p>
		<p>
			<a href="/billing">Manage preferences</a>
		</p>
	</div>
</body>
</html>
	`.trim();
}

app.get('/api/email/unsubscribe', async (req, res) => {
	try {
		const token = getQueryString(req.query.token);
		if (!token) {
			return res.status(400).send(unsubscribeHtmlMessage('Missing unsubscribe token.'));
		}
		const { userId } = parseUnsubToken(token);
		await setConsent(userId, { marketingOptIn: false });
		res.setHeader('Cache-Control', 'no-store');
		res.setHeader('Content-Type', 'text/html; charset=utf-8');
		return res.send(
			unsubscribeHtmlMessage("You're unsubscribed. You can manage preferences anytime from your billing page.")
		);
	} catch (e: unknown) {
		const err = e as { message?: string };
		const msg = String(err?.message ?? e ?? 'invalid_token');
		res.setHeader('Cache-Control', 'no-store');
		res.setHeader('Content-Type', 'text/html; charset=utf-8');
		return res.status(400).send(unsubscribeHtmlMessage('Invalid or expired unsubscribe link.'));
	}
});

app.post('/api/email/unsubscribe', async (req, res) => {
	try {
		const header = req.headers['list-unsubscribe'];
		if (typeof header !== 'string' || header.toLowerCase() !== 'one-click') {
			return res.status(400).json({ error: 'missing_list_unsubscribe_header' });
		}
		const token = typeof req.body?.token === 'string' ? req.body.token : null;
		if (!token) {
			return res.status(400).json({ error: 'invalid_token' });
		}
		const { userId } = parseUnsubToken(token);
		await setConsent(userId, { marketingOptIn: false });
		res.setHeader('Cache-Control', 'no-store');
		return res.status(204).send();
	} catch (e: unknown) {
		const err = e as { message?: string };
		const msg = String(err?.message ?? e ?? 'invalid_token');
		if (msg === 'invalid_token' || msg === 'token_expired') {
			return res.status(400).json({ error: 'invalid_token' });
		}
		res.status(500).json({ error: 'internal_error' });
	}
});

if (process.env.NODE_ENV !== 'production') {
	app.get('/api/debug/whoami', async (req, res) => {
		try {
			const user = await getSessionUser(req, res);
			return res.json({ ok: true, user });
		} catch {
			return res.status(401).json({ ok: false });
		}
	});

	// Dev route to test welcome email
	app.post('/api/dev/send-welcome', async (req, res) => {
		try {
			const user = await getSessionUser(req, res);
			const status = await sendWelcome(user.id);
			res.setHeader('Cache-Control', 'no-store');
			return res.json({ ok: true, status });
		} catch (e: unknown) {
			const err = e as { message?: string };
			if (String(err?.message).includes('UNAUTHENTICATED')) {
				return res.status(401).json({ error: 'unauthenticated' });
			}
			console.error('[dev/send-welcome]', err);
			return res.status(500).json({ error: String(err?.message ?? e ?? 'Internal server error') });
		}
	});
}

// GET /api/billing/balance
app.get('/api/billing/balance', async (req, res) => {
	try {
		const user = await getSessionUser(req, res);
		const balance = await getBalance(user.id);
		res.setHeader('Cache-Control', 'no-store');
		return res.status(200).json({ balance });
	} catch (e: unknown) {
		const err = e as { message?: string; code?: string };
		const msg = String(err?.message ?? e ?? 'Internal error');
		if (err instanceof UnauthenticatedError || err?.code === 'UNAUTHENTICATED' || msg.includes('UNAUTHENTICATED')) {
			return res.status(401).json({ error: 'unauthenticated' });
		}
		console.error('[balance] err:', msg);
		return res.status(500).json({ error: 'internal_error', hint: 'balance_route' });
	}
});

// API key management
app.get('/api/keys', async (req, res) => {
	try {
		const user = await getSessionUser(req, res);
		const keys = await listKeys(user.id);
		res.setHeader('Cache-Control', 'no-store');
		res.json(keys);
	} catch (e: unknown) {
		const err = e as { message?: string };
		if (String(err?.message).includes('UNAUTHENTICATED')) {
			return res.status(401).json({ error: 'unauthenticated' });
		}
		res.status(500).json({ error: String(err?.message ?? e ?? 'Internal server error') });
	}
});

app.post('/api/keys', async (req, res) => {
	try {
		const user = await getSessionUser(req, res);
		const { name } = req.body ?? {};
		const keyName = typeof name === 'string' && name.trim().length > 0 ? name.trim() : 'API Key';
		const created = await createKeyForUser(user.id, keyName);
		res.setHeader('Cache-Control', 'no-store');
		res.json(created);
	} catch (e: unknown) {
		const err = e as { message?: string };
		if (String(err?.message).includes('UNAUTHENTICATED')) {
			return res.status(401).json({ error: 'unauthenticated' });
		}
		res.status(500).json({ error: String(err?.message ?? e ?? 'Internal server error') });
	}
});

app.post('/api/keys/revoke', async (req, res) => {
	try {
		const user = await getSessionUser(req, res);
		const { id } = req.body ?? {};
		if (!id || typeof id !== 'string') {
			return res.status(400).json({ error: 'invalid_id' });
		}
		await revokeKey(user.id, id);
		res.setHeader('Cache-Control', 'no-store');
		res.json({ ok: true });
	} catch (e: unknown) {
		const err = e as { message?: string };
		if (String(err?.message).includes('UNAUTHENTICATED')) {
			return res.status(401).json({ error: 'unauthenticated' });
		}
		res.status(500).json({ error: String(err?.message ?? e ?? 'Internal server error') });
	}
});

// GET /api/billing/history
app.get('/api/billing/history', async (req, res) => {
	try {
		const user = await getSessionUser(req, res);
		const days = Math.min(365, Math.max(7, Number(req.query.days ?? 30)));
		const limit = Math.min(200, Math.max(10, Number(req.query.limit ?? 50)));
		const to = new Date();
		const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

		const [tx, ue] = await Promise.all([
			admin
				.from('credit_transactions')
				.select('id, delta, reason, metadata, created_at')
				.eq('user_id', user.id)
				.gte('created_at', from.toISOString())
				.lte('created_at', to.toISOString())
				.order('created_at', { ascending: false })
				.limit(limit),
			admin
				.from('usage_events')
				.select('id, event_type, cost, tokens, request_id, metadata, created_at')
				.eq('user_id', user.id)
				.gte('created_at', from.toISOString())
				.lte('created_at', to.toISOString())
				.order('created_at', { ascending: false })
				.limit(limit),
		]);

		if (tx.error) throw tx.error;
		if (ue.error) throw ue.error;

		res.json({
			from: from.toISOString(),
			to: to.toISOString(),
			credits: tx.data ?? [],
			usage: ue.data ?? [],
		});
	} catch (e: unknown) {
		const err = e as { message?: string };
		if (String(err?.message).includes('UNAUTHENTICATED')) {
			return res.status(401).json({ error: 'unauthenticated' });
		}
		res.status(500).json({ error: String(err?.message ?? e ?? 'Internal server error') });
	}
});

// GET /api/billing/invoices
app.get('/api/billing/invoices', async (req, res) => {
	try {
		const user = await getSessionUser(req, res);
		const limitParam = Number.parseInt((req.query.limit as string) ?? '20', 10);
		const limit = Math.max(5, Math.min(50, Number.isNaN(limitParam) ? 20 : limitParam));
		const cursor =
			typeof req.query.starting_after === 'string' ? req.query.starting_after : undefined;

		let stripeCustomerId: string | null = null;
		const existing = await admin
			.from('subscriptions')
			.select('stripe_customer_id')
			.eq('user_id', user.id)
			.not('stripe_customer_id', 'is', null)
			.order('created_at', { ascending: false })
			.limit(1)
			.single();
		if (!existing.error && existing.data?.stripe_customer_id) {
			stripeCustomerId = existing.data.stripe_customer_id as string;
		}
		if (!stripeCustomerId) {
			stripeCustomerId = await ensureStripeCustomer(user.id, user.email);
		}

		const invoices = await stripe.invoices.list({
			customer: stripeCustomerId,
			limit,
			starting_after: cursor,
			expand: ['data.charge']
		});

		const dto = invoices.data.map((invoice) => ({
			id: invoice.id,
			number: invoice.number ?? null,
			status: invoice.status ?? 'open',
			currency: invoice.currency ?? 'usd',
			total: invoice.total ?? 0,
			amount_due: invoice.amount_due ?? 0,
			amount_paid: invoice.amount_paid ?? 0,
			hosted_invoice_url: invoice.hosted_invoice_url ?? null,
			invoice_pdf: invoice.invoice_pdf ?? null,
			created: invoice.created ? new Date(invoice.created * 1000).toISOString() : '',
			period_start: invoice.lines.data[0]?.period?.start
				? new Date(invoice.lines.data[0].period.start * 1000).toISOString()
				: null,
			period_end: invoice.lines.data[0]?.period?.end
				? new Date(invoice.lines.data[0].period.end * 1000).toISOString()
				: null
		}));

		res.setHeader('Cache-Control', 'no-store');
		res.json({
			items: dto,
			has_more: invoices.has_more,
			next_cursor: invoices.has_more ? invoices.data[invoices.data.length - 1]?.id ?? null : null
		});
	} catch (e) {
		const err = e as { message?: string };
		if (String(err?.message).includes('UNAUTHENTICATED')) {
			return res.status(401).json({ error: 'unauthenticated' });
		}
		res.status(500).json({ error: String(err?.message ?? e ?? 'Internal server error') });
	}
});

// GET /api/analytics/me
app.get('/api/analytics/me', async (req, res) => {
	try {
		const user = await getSessionUser(req, res);
		const rawDays = Number.parseInt((req.query.days as string) ?? '30', 10);
		const days = Math.max(7, Math.min(365, Number.isNaN(rawDays) ? 30 : rawDays));

		const to = new Date();
		const from = new Date(to);
		from.setUTCHours(0, 0, 0, 0);
		from.setUTCDate(from.getUTCDate() - (days - 1));

		const fromIso = from.toISOString();
		const toIso = to.toISOString();

		const [creditResp, usageResp] = await Promise.all([
			admin
				.from('credit_transactions')
				.select('delta, created_at')
				.eq('user_id', user.id)
				.gte('created_at', fromIso)
				.lte('created_at', toIso),
			admin
				.from('usage_events')
				.select('event_type, cost, tokens, created_at')
				.eq('user_id', user.id)
				.gte('created_at', fromIso)
				.lte('created_at', toIso)
		]);

		if (creditResp.error) throw creditResp.error;
		if (usageResp.error) throw usageResp.error;

		const dailyMap = new Map<
			string,
			{ creditsIn: number; creditsOut: number; usageCost: number; tokens: number }
		>();

		for (let i = 0; i < days; i++) {
			const day = new Date(from);
			day.setUTCDate(from.getUTCDate() + i);
			const key = dayKey(day);
			dailyMap.set(key, { creditsIn: 0, creditsOut: 0, usageCost: 0, tokens: 0 });
		}

		let totalCreditsIn = 0;
		let totalCreditsOut = 0;

		for (const row of creditResp.data ?? []) {
			const key = dayKey(new Date(row.created_at as string));
			const bucket = dailyMap.get(key);
			if (!bucket) continue;
			const delta = Number(row.delta) || 0;
			if (delta > 0) {
				bucket.creditsIn += delta;
				totalCreditsIn += delta;
			} else if (delta < 0) {
				const out = Math.abs(delta);
				bucket.creditsOut += out;
				totalCreditsOut += out;
			}
		}

		const byEventMap = new Map<
			string,
			{ eventType: string; count: number; cost: number; tokens: number }
		>();
		let totalUsageCost = 0;
		let totalTokens = 0;

		for (const row of usageResp.data ?? []) {
			const key = dayKey(new Date(row.created_at as string));
			const bucket = dailyMap.get(key);
			if (bucket) {
				const cost = Number(row.cost) || 0;
				const tokens = Number(row.tokens) || 0;
				bucket.usageCost += cost;
				bucket.tokens += tokens;
				totalUsageCost += cost;
				totalTokens += tokens;
			}

			const eventType = (row.event_type as string) ?? 'unknown';
			const entry = byEventMap.get(eventType) ?? {
				eventType,
				count: 0,
				cost: 0,
				tokens: 0
			};
			entry.count += 1;
			entry.cost += Number(row.cost) || 0;
			entry.tokens += Number(row.tokens) || 0;
			byEventMap.set(eventType, entry);
		}

		const daily = Array.from(dailyMap.entries()).map(([date, values]) => ({
			date,
			...values
		}));

		const byEvent = Array.from(byEventMap.values()).sort((a, b) => {
			if (b.cost !== a.cost) return b.cost - a.cost;
			return b.count - a.count;
		});

		res.setHeader('Cache-Control', 'no-store');
		res.json({
			from: fromIso,
			to: toIso,
			totals: {
				creditsIn: totalCreditsIn,
				creditsOut: totalCreditsOut,
				usageCost: totalUsageCost,
				tokens: totalTokens
			},
			daily,
			byEvent
		});
	} catch (e: unknown) {
		const err = e as { message?: string };
		if (String(err?.message).includes('UNAUTHENTICATED')) {
			return res.status(401).json({ error: 'unauthenticated' });
		}
		res.status(500).json({ error: String(err?.message ?? e ?? 'Internal server error') });
	}
});

// GET /api/billing/plan
app.get('/api/billing/plan', async (req, res) => {
	try {
		const user = await getSessionUser(req, res);
		const snapshot = await getPlanSnapshot(user.id);
		const { data, error } = await admin
			.from('users')
			.select('is_admin')
			.eq('id', user.id)
			.single();
		if (error) throw error;
		res.json({
			...snapshot,
			features: {
				...snapshot.features,
				admin: data?.is_admin ?? false
			}
		});
	} catch (e: unknown) {
		const err = e as { message?: string };
		if (String(err?.message).includes('UNAUTHENTICATED')) {
			return res.status(401).json({ error: 'unauthenticated' });
		}
		res.status(500).json({ error: String(err?.message ?? e ?? 'Internal server error') });
	}
});

// GET /api/billing/watermark
app.get('/api/billing/watermark', async (req, res) => {
	try {
		const user = await getSessionUser(req, res);
		const [planCode, required] = await Promise.all([
			getEffectivePlanCode(user.id),
			shouldWatermark(user.id)
		]);
		res.json({
			required,
			planCode,
			features: { watermarking: required }
		});
	} catch (e: unknown) {
		const err = e as { message?: string };
		if (String(err?.message).includes('UNAUTHENTICATED')) {
			return res.status(401).json({ error: 'unauthenticated' });
		}
		res.status(500).json({ error: String(err?.message ?? e ?? 'Internal server error') });
	}
});

if (process.env.NODE_ENV === 'production') {
	app.all('/api/billing/record-usage', (_req, res) =>
		res.status(404).json({ error: 'disabled_in_production' })
	);
} else {
	app.post(
		'/api/billing/record-usage',
		requireApiAccess,
		attachPlanCode,
		rateLimitByPlan(SCOPES.default),
		async (req, res) => {
			try {
				const user = await getSessionUser(req, res);
				const { eventType, cost, tokens, requestId, metadata } = req.body ?? {};

				if (!eventType || !Number.isFinite(cost) || cost <= 0) {
					return res.status(400).json({ error: 'invalid_input' });
				}

				const out = await recordUsageEvent({
					userId: user.id,
					eventType,
					cost,
					tokens,
					requestId,
					metadata
				});

				res.json(out);
			} catch (e: unknown) {
				const err = e as { message?: string; code?: string };
				const msg = String(err?.message ?? e ?? 'Internal server error');
				if (msg.includes('UNAUTHENTICATED')) {
					return res.status(401).json({ error: 'unauthenticated' });
				}
				if (msg.includes('INSUFFICIENT_CREDITS') || err?.code === 'INSUFFICIENT_CREDITS') {
					return res.status(402).json({ error: 'insufficient_credits' });
				}
				if (msg.includes('INVALID_AMOUNT') || msg.includes('INVALID_INPUT') || err?.code === 'INVALID_AMOUNT') {
					return res.status(400).json({ error: 'invalid_input' });
				}
				res.status(500).json({ error: msg });
			}
		}
	);
}

// API key protected external route
app.get('/api/external/ping', authenticateApiKey(SCOPES.default), async (req, res) => {
	const user = (req as any).user;
	if (!user) {
		return res.status(500).json({ error: 'missing_user_context' });
	}
	const planCode = (req as any).planCode ?? (await getEffectivePlanCode(user.id));
	res.setHeader('Cache-Control', 'no-store');
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, x-api-key');
	res.json({
		ok: true,
		userId: user.id,
		plan: planCode,
		now: new Date().toISOString()
	});
});

app.post(
	'/api/external/generate/image',
	authenticateApiKey(SCOPES.generate),
	rateLimitByPlan(SCOPES.generate),
	attachWatermarkFlag,
	async (req, res) => {
		try {
			const user = (req as any).user as { id: string };
			const watermarkRequired: boolean = (req as any).watermarkRequired === true;
			const { prompt, width = 512, height = 512, requestId } = req.body ?? {};
			if (!prompt || typeof prompt !== 'string') {
				return res.status(400).json({ error: 'invalid_prompt' });
			}

			const pngBuffer = Buffer.from(
				'89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C636000000200010005FE02FEA7F6050000000049454E44AE426082',
				'hex'
			);

			const wmBuffer = await applyWatermarkIfRequired(pngBuffer, watermarkRequired, {
				text: 'Lenci • Free',
				opacity: 0.22
			});

			const idKey = requestId && typeof requestId === 'string' ? requestId : newRequestId();
			const result = await recordUsageEvent({
				userId: user.id,
				eventType: 'image.generate',
				cost: costOf('image.generate'),
				tokens: Math.max(1, Math.floor(((Number(width) || 512) * (Number(height) || 512)) / 65536)),
				requestId: idKey,
				metadata: { promptLen: prompt.length, width, height }
			});

			// Best-effort low-credit notification (don't fail request on email errors)
			// Fetch threshold and email preference from auto_topup_settings (defaults to 10 and true if not set)
			getAutoTopupSettings(user.id)
				.then(({ threshold, lowCreditEmailsEnabled }) => {
					if (lowCreditEmailsEnabled) {
						return maybeNotifyLowCredit(user.id, result.newBalance, threshold);
					}
					return Promise.resolve('skipped' as const);
				})
				.catch(() => {
					// Default to enabled if settings fetch fails
					return maybeNotifyLowCredit(user.id, result.newBalance, 10);
				})
				.catch((err) => {
					console.error('[email] Low-credit notification failed:', err);
				});

			// Best-effort auto top-up (don't fail request on errors)
			try {
				await maybeAutoTopup(user.id, result.newBalance);
			} catch (e) {
				console.warn('[auto-topup] skipped:', e);
			}

			res.setHeader('Content-Type', 'image/png');
			res.setHeader('Cache-Control', 'no-store');
			res.setHeader('X-Usage-New-Balance', String(result.newBalance));
			res.setHeader('X-Usage-Was-Duplicate', String(result.wasDuplicate));
			res.setHeader('X-Watermarked', String(watermarkRequired));
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, x-api-key');
			return res.status(200).send(wmBuffer);
		} catch (e) {
			const err = e as { message?: string };
			const msg = String(err?.message ?? e ?? 'Internal server error');
			if (msg.includes('INSUFFICIENT_CREDITS')) {
				return res.status(402).json({ error: 'insufficient_credits' });
			}
				if (msg.includes('invalid_api_key')) {
				return res.status(401).json({ error: 'invalid_api_key' });
			}
			return res.status(500).json({ error: msg });
		}
	}
);

app.post(
	'/api/external/generate/text',
	authenticateApiKey(SCOPES.generate),
	rateLimitByPlan(SCOPES.generate),
	attachWatermarkFlag,
	async (req, res) => {
		try {
			const user = (req as any).user as { id: string };
			const watermarkRequired: boolean = (req as any).watermarkRequired === true;
			const { prompt, requestId } = req.body ?? {};
			if (!prompt || typeof prompt !== 'string') {
				return res.status(400).json({ error: 'invalid_prompt' });
			}

			const raw = `Echo: ${prompt}`;
			const output = watermarkRequired ? `${raw}\n\n— Generated on Free plan (watermarked)` : raw;

			const idKey = requestId && typeof requestId === 'string' ? requestId : newRequestId();
			const result = await recordUsageEvent({
				userId: user.id,
				eventType: 'text.generate',
				cost: costOf('text.generate'),
				tokens: Math.max(1, Math.floor(prompt.length / 4)),
				requestId: idKey,
				metadata: { promptLen: prompt.length }
			});

			// Best-effort low-credit notification (don't fail request on email errors)
			// Fetch threshold and email preference from auto_topup_settings (defaults to 10 and true if not set)
			getAutoTopupSettings(user.id)
				.then(({ threshold, lowCreditEmailsEnabled }) => {
					if (lowCreditEmailsEnabled) {
						return maybeNotifyLowCredit(user.id, result.newBalance, threshold);
					}
					return Promise.resolve('skipped' as const);
				})
				.catch(() => {
					// Default to enabled if settings fetch fails
					return maybeNotifyLowCredit(user.id, result.newBalance, 10);
				})
				.catch((err) => {
					console.error('[email] Low-credit notification failed:', err);
				});

			// Best-effort auto top-up (don't fail request on errors)
			try {
				await maybeAutoTopup(user.id, result.newBalance);
			} catch (e) {
				console.warn('[auto-topup] skipped:', e);
			}

			res.setHeader('Content-Type', 'application/json');
			res.setHeader('Cache-Control', 'no-store');
			res.setHeader('X-Usage-New-Balance', String(result.newBalance));
			res.setHeader('X-Usage-Was-Duplicate', String(result.wasDuplicate));
			res.setHeader('X-Watermarked', String(watermarkRequired));
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, x-api-key');
			return res.status(200).json({ output, watermarked: watermarkRequired });
		} catch (e) {
			const err = e as { message?: string };
			const msg = String(err?.message ?? e ?? 'Internal server error');
			if (msg.includes('INSUFFICIENT_CREDITS')) {
				return res.status(402).json({ error: 'insufficient_credits' });
			}
			if (msg.includes('invalid_api_key')) {
				return res.status(401).json({ error: 'invalid_api_key' });
			}
			return res.status(500).json({ error: msg });
		}
	}
);

// Admin analytics overview
app.get('/api/admin/analytics/overview', requireAdmin, async (req, res) => {
	try {
		const daysParam = Number.parseInt((req.query.days as string) ?? '30', 10);
		const limitParam = Number.parseInt((req.query.limit as string) ?? '20', 10);
		const days = Math.max(7, Math.min(365, Number.isNaN(daysParam) ? 30 : daysParam));
		const limit = Math.max(10, Math.min(100, Number.isNaN(limitParam) ? 20 : limitParam));

		const now = new Date();
		const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
		const fromIso = from.toISOString();
		const toIso = now.toISOString();

		const [creditAgg, usageAgg, byPlanAgg, topCreditsAgg, topUsageAgg] = await Promise.all([
			admin.rpc('analytics_credits_totals', { p_from: fromIso, p_to: toIso }),
			admin.rpc('analytics_usage_totals', { p_from: fromIso, p_to: toIso }),
			admin.rpc('analytics_plan_counts'),
			admin.rpc('analytics_top_credits', { p_from: fromIso, p_to: toIso, p_limit: limit }),
			admin.rpc('analytics_top_usage', { p_from: fromIso, p_to: toIso, p_limit: limit })
		]);

		const totals = {
			creditsIn: creditAgg.data?.credits_in ?? 0,
			creditsOut: creditAgg.data?.credits_out ?? 0,
			usageCost: usageAgg.data?.usage_cost ?? 0,
			tokens: usageAgg.data?.tokens ?? 0
		};

		res.setHeader('Cache-Control', 'no-store');
		res.json({
			from: fromIso,
			to: toIso,
			totals,
			byPlan: byPlanAgg.data ?? [],
			topByCreditsOut: topCreditsAgg.data ?? [],
			topByUsageCost: topUsageAgg.data ?? []
		});
	} catch (e) {
		const err = e as { message?: string };
		res.status(500).json({ error: String(err?.message ?? e ?? 'Internal server error') });
	}
});

app.get('/api/admin/analytics/usage.csv', requireAdmin, async (req, res) => {
	try {
		const daysParam = Number.parseInt((req.query.days as string) ?? '30', 10);
		const days = Math.max(7, Math.min(365, Number.isNaN(daysParam) ? 30 : daysParam));
		const now = new Date();
		const fromIso = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

		const { data, error } = await admin.rpc('analytics_usage_csv', { p_from: fromIso });
		if (error) throw error;

		const rows = (data ?? []) as Array<{
			user_id: string;
			display_name: string | null;
			username: string | null;
			credits_in: number;
			credits_out: number;
			usage_cost: number;
			tokens: number;
		}>;

		const header = 'user_id,display_name,username,credits_in,credits_out,usage_cost,tokens';
		const csvLines = rows.map((row) =>
			[
				row.user_id,
				row.display_name ?? '',
				row.username ?? '',
				row.credits_in ?? 0,
				row.credits_out ?? 0,
				row.usage_cost ?? 0,
				row.tokens ?? 0
			]
				.map((value) => `"${String(value).replace(/"/g, '""')}"`)
				.join(',')
		);

		res.setHeader('Cache-Control', 'no-store');
		res.setHeader('Content-Type', 'text/csv');
		res.send([header, ...csvLines].join('\n'));
	} catch (e) {
		const err = e as { message?: string };
		res.status(500).json({ error: String(err?.message ?? e ?? 'Internal server error') });
	}
});

app.get('/api/admin/emails', requireAdmin, async (req, res) => {
	try {
		const type = getQueryString(req.query.type);
		if (type && !EMAIL_EVENT_TYPES.has(type)) {
			return res.status(400).json({ error: 'invalid_type' });
		}
		const userId = getQueryString(req.query.userId);
		const days = Math.max(1, Math.min(365, parseNumberParam(req.query.days) ?? 30));
		const limit = Math.max(10, Math.min(200, parseNumberParam(req.query.limit) ?? 50));
		const cursor = parseCursorParam(req.query.cursor);

		const fromIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

		let query = admin
			.from('email_events')
			.select('id,user_id,type,language,created_at,payload')
			.gte('created_at', fromIso)
			.order('created_at', { ascending: false })
			.order('id', { ascending: false })
			.limit(limit + 1);

		if (type) query = query.eq('type', type);
		if (userId) query = query.eq('user_id', userId);
		if (cursor) query = query.lt('created_at', cursor);

		const { data, error } = await query;
		if (error) throw error;

		const rows = data ?? [];
		const hasMore = rows.length > limit;
		const items = hasMore ? rows.slice(0, limit) : rows;
		const nextCursor = hasMore ? items[items.length - 1].created_at : null;

		res.setHeader('Cache-Control', 'no-store');
		return res.json({
			items: items.map((row) => ({
				id: row.id,
				userId: row.user_id,
				type: row.type,
				language: row.language,
				createdAt: row.created_at,
				payload: row.payload ?? {}
			})),
			nextCursor
		});
	} catch (e: unknown) {
		const err = e as { message?: string };
		res.status(500).json({ error: String(err?.message ?? e ?? 'internal_error') });
	}
});

app.get('/api/admin/emails.csv', requireAdmin, async (req, res) => {
	try {
		const type = getQueryString(req.query.type);
		if (type && !EMAIL_EVENT_TYPES.has(type)) {
			return res.status(400).json({ error: 'invalid_type' });
		}
		const userId = getQueryString(req.query.userId);
		const days = Math.max(1, Math.min(365, parseNumberParam(req.query.days) ?? 30));
		const limit = Math.max(10, Math.min(500, parseNumberParam(req.query.limit) ?? 200));
		const cursor = parseCursorParam(req.query.cursor);

		const fromIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

		let query = admin
			.from('email_events')
			.select('id,user_id,type,language,created_at,payload')
			.gte('created_at', fromIso)
			.order('created_at', { ascending: false })
			.order('id', { ascending: false })
			.limit(limit);

		if (type) query = query.eq('type', type);
		if (userId) query = query.eq('user_id', userId);
		if (cursor) query = query.lt('created_at', cursor);

		const { data, error } = await query;
		if (error) throw error;

		const rows = data ?? [];
		const header =
			'id,user_id,type,language,created_at,amount_cents,currency,credits,stripe_object_id,receipt_url';
		const csvLines = rows.map((row) => {
			const payload = (row.payload ?? {}) as Record<string, unknown>;
			const amount =
				parseNumberParam(payload.amount_cents) ??
				parseNumberParam(payload.amount_due_cents) ??
				parseNumberParam(payload.amount_due);
			const credits =
				parseNumberParam(payload.credits) ?? parseNumberParam(payload.balance) ?? null;
			const currency = getQueryString(payload.currency) ?? '';
			const stripeObjectId = getQueryString(payload.stripe_object_id) ?? '';
			const receiptUrl = getQueryString(payload.receipt_url) ?? '';

			return [
				row.id,
				row.user_id,
				row.type,
				row.language,
				row.created_at,
				amount ?? '',
				currency,
				credits ?? '',
				stripeObjectId,
				receiptUrl
			]
				.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
				.join(',');
		});

		res.setHeader('Cache-Control', 'no-store');
		res.setHeader('Content-Type', 'text/csv');
		return res.send([header, ...csvLines].join('\n'));
	} catch (e: unknown) {
		const err = e as { message?: string };
		res.status(500).json({ error: String(err?.message ?? e ?? 'internal_error') });
	}
});

app.get('/api/admin/email-preview', requireAdmin, async (req, res) => {
	try {
		const kind = getQueryString(req.query.kind) as EmailPreviewKind | null;
		if (!kind || !EMAIL_EVENT_TYPES.has(kind)) {
			return res.status(400).json({ error: 'invalid_kind' });
		}

		const userId = getQueryString(req.query.userId);
		if ((kind === 'welcome' || kind === 'low_credit') && !userId) {
			return res.status(400).json({ error: 'user_required' });
		}

		const preview = await renderEmailPreview({
			kind,
			userId: userId ?? undefined,
			amountCents: parseNumberParam(req.query.amountCents) ?? undefined,
			currency: getQueryString(req.query.currency) ?? undefined,
			credits: parseNumberParam(req.query.credits) ?? undefined,
			receiptUrl: getQueryString(req.query.receiptUrl) ?? undefined,
			invoiceNumber: getQueryString(req.query.invoiceNumber) ?? undefined,
			balance: parseNumberParam(req.query.balance) ?? undefined,
			receiptKind: getQueryString(req.query.receiptKind) === 'topup_auto' ? 'topup_auto' : 'topup'
		});

		res.setHeader('Cache-Control', 'no-store');
		return res.json({ ok: true, ...preview });
	} catch (e: unknown) {
		const err = e as { message?: string };
		const message = String(err?.message ?? e ?? 'internal_error');
		if (message === 'user_required') {
			return res.status(400).json({ error: 'user_required' });
		}
		if (message === 'unsupported_kind' || message === 'invalid_kind') {
			return res.status(400).json({ error: 'invalid_kind' });
		}
		res.status(500).json({ error: 'internal_error' });
	}
});

app.get('/api/admin/email-jobs', requireAdmin, async (req, res) => {
	try {
		const status = getQueryString(req.query.status);
		const template = getQueryString(req.query.template);
		const email = getQueryString(req.query.email);
		const days = Math.min(365, Math.max(1, parseNumberParam(req.query.days) ?? 90));
		const limit = Math.min(200, Math.max(10, parseNumberParam(req.query.limit) ?? 50));
		const cursor = parseCursorParam(req.query.cursor);

		const baseQuery = admin
			.from('email_jobs')
			.select(
				'id,user_id,to_email,category,template,subject,status,attempts,max_attempts,last_error,run_at,sent_at,created_at'
			)
			.order('run_at', { ascending: false })
			.limit(limit + 1);

		let query = baseQuery.gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());
		if (status && status !== 'all') query = query.eq('status', status);
		if (template && template !== 'all') query = query.eq('template', template);
		if (email) query = query.eq('to_email', email.toLowerCase());
		if (cursor) query = query.lt('run_at', cursor);

		const { data, error } = await query;
		if (error) throw error;
		const rows = data ?? [];
		const hasMore = rows.length > limit;
		const items = hasMore ? rows.slice(0, limit) : rows;
		res.setHeader('Cache-Control', 'no-store');
		return res.json({
			items: items.map((row) => ({
				id: row.id,
				userId: row.user_id,
				toEmail: row.to_email,
				category: row.category,
				template: row.template,
				subject: row.subject,
				status: row.status,
				attempts: row.attempts,
				maxAttempts: row.max_attempts,
				lastError: row.last_error,
				runAt: row.run_at,
				createdAt: row.created_at,
				sentAt: row.sent_at
			})),
			nextCursor: hasMore ? items[items.length - 1].runAt : null
		});
	} catch (e: unknown) {
		const err = e as { message?: string };
		res.status(500).json({ error: String(err?.message ?? e ?? 'internal_error') });
	}
});

app.post('/api/admin/email-jobs/:id/retry', requireAdmin, async (req, res) => {
	try {
		const jobId = req.params.id;
		if (!jobId) return res.status(400).json({ error: 'missing_id' });
		const { data, error } = await admin
			.from('email_jobs')
			.update({
				status: 'pending',
				attempts: 0,
				run_at: new Date().toISOString(),
				last_error: null
			})
			.eq('id', jobId)
			.select('id')
			.single();
		if (error) throw error;
		res.setHeader('Cache-Control', 'no-store');
		return res.json({ ok: true, id: data!.id });
	} catch (e: unknown) {
		const err = e as { message?: string };
		res.status(500).json({ error: String(err?.message ?? e ?? 'internal_error') });
	}
});

app.delete('/api/admin/email-jobs/:id', requireAdmin, async (req, res) => {
	try {
		const jobId = req.params.id;
		if (!jobId) return res.status(400).json({ error: 'missing_id' });
		const { error } = await admin.from('email_jobs').delete().eq('id', jobId);
		if (error) throw error;
		res.setHeader('Cache-Control', 'no-store');
		return res.json({ ok: true });
	} catch (e: unknown) {
		const err = e as { message?: string };
		res.status(500).json({ error: String(err?.message ?? e ?? 'internal_error') });
	}
});

app.post('/api/admin/email-jobs/tick', requireAdmin, async (req, res) => {
	try {
		const limit = Math.min(100, Math.max(1, parseNumberParam(req.query.limit) ?? 50));
		const jobs = await claimDueJobs(limit);
		let sent = 0;
		let retried = 0;
		let dead = 0;
		for (const job of jobs) {
			try {
				// worker logic will be added next prompt; mark as sent for now
				await markSent(job.id);
				sent += 1;
			} catch (err) {
				if (job.attempts + 1 >= job.max_attempts) {
					await markDead(job.id, err);
					dead += 1;
				} else {
					await markRetry(job.id, err, job.attempts + 1);
					retried += 1;
				}
			}
		}
		res.setHeader('Cache-Control', 'no-store');
		return res.json({
			processed: jobs.length,
			sent,
			retried,
			dead
		});
	} catch (e: unknown) {
		const err = e as { message?: string };
		res.status(500).json({ error: String(err?.message ?? e ?? 'internal_error') });
	}
});

app.get('/api/admin/suppressions', requireAdmin, async (req, res) => {
	try {
		const emailFilter = getQueryString(req.query.email);
		const reasonFilter = getQueryString(req.query.reason);
		const sourceFilter = getQueryString(req.query.source);
		const days = Math.max(1, Math.min(365, parseNumberParam(req.query.days) ?? 180));
		const limit = Math.max(10, Math.min(200, parseNumberParam(req.query.limit) ?? 50));
		const cursor = parseCursorParam(req.query.cursor);

		const fromIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

		let query = admin
			.from('email_suppressions')
			.select('id,user_id,email,reason,source,created_at,details')
			.gte('created_at', fromIso)
			.order('created_at', { ascending: false })
			.order('id', { ascending: false })
			.limit(limit + 1);

		if (emailFilter) query = query.eq('email', normalizeEmail(emailFilter));
		if (reasonFilter) query = query.eq('reason', reasonFilter);
		if (sourceFilter) query = query.eq('source', sourceFilter);
		if (cursor) query = query.lt('created_at', cursor);

		const { data, error } = await query;
		if (error) throw error;

		const rows = data ?? [];
		const hasMore = rows.length > limit;
		const items = hasMore ? rows.slice(0, limit) : rows;
		const nextCursor = hasMore ? items[items.length - 1].created_at : null;

		res.setHeader('Cache-Control', 'no-store');
		return res.json({
			items: items.map((row) => ({
				id: row.id,
				userId: row.user_id,
				email: row.email,
				reason: row.reason,
				source: row.source,
				createdAt: row.created_at,
				details: row.details ?? {}
			})),
			nextCursor
		});
	} catch (e: unknown) {
		const err = e as { message?: string };
		res.status(500).json({ error: String(err?.message ?? e ?? 'internal_error') });
	}
});

app.delete('/api/admin/suppressions/:id', requireAdmin, async (req, res) => {
	try {
		const id = req.params.id;
		if (!id) {
			return res.status(400).json({ error: 'invalid_id' });
		}
		const { error } = await admin.from('email_suppressions').delete().eq('id', id);
		if (error) throw error;
		res.setHeader('Cache-Control', 'no-store');
		return res.json({ ok: true });
	} catch (e: unknown) {
		const err = e as { message?: string };
		res.status(500).json({ error: String(err?.message ?? e ?? 'internal_error') });
	}
});
// POST /api/stripe/checkout
app.post('/api/stripe/checkout', async (req, res) => {
	try {
		const user = await getSessionUser(req, res);
		const { planCode, successUrl, cancelUrl } = req.body ?? {};
		if (!['starter', 'professional'].includes(planCode)) {
			return res.status(400).json({ error: 'invalid_plan' });
		}
		if (!successUrl || !cancelUrl) {
			return res.status(400).json({ error: 'missing_urls' });
		}
		const session = await createCheckoutSession({
			userId: user.id,
			planCode,
			successUrl,
			cancelUrl,
			email: user.email
		});
		res.json(session);
	} catch (e: unknown) {
		const err = e as { message?: string };
		if (String(err?.message).includes('UNAUTHENTICATED')) {
			return res.status(401).json({ error: 'unauthenticated' });
		}
		res.status(500).json({ error: String(err?.message ?? e ?? 'Internal server error') });
	}
});

// POST /api/stripe/portal
app.post('/api/stripe/portal', async (req, res) => {
	try {
		const user = await getSessionUser(req, res);
		const { returnUrl } = req.body ?? {};
		if (!returnUrl) {
			return res.status(400).json({ error: 'missing_return_url' });
		}
		const customerId = await ensureStripeCustomer(user.id, user.email);
		const session = await createBillingPortalSession(customerId, returnUrl);
		res.json(session);
	} catch (e: unknown) {
		const err = e as { message?: string };
		if (String(err?.message).includes('UNAUTHENTICATED')) {
			return res.status(401).json({ error: 'unauthenticated' });
		}
		res.status(500).json({ error: String(err?.message ?? e ?? 'Internal server error') });
	}
});

// GET /api/billing/topup/options
app.get('/api/billing/topup/options', async (req, res) => {
	try {
		await getSessionUser(req, res); // just to ensure 401 if not logged in
		const options = await listTopupOptions();
		res.setHeader('Cache-Control', 'no-store');
		return res.json({ options });
	} catch (e: unknown) {
		const err = e as { message?: string; code?: string };
		const s = err?.code === 'UNAUTHENTICATED' || String(err?.message).includes('UNAUTHENTICATED') ? 401 : 500;
		return res.status(s).json({ error: s === 401 ? 'unauthenticated' : 'internal_error' });
	}
});

// POST /api/stripe/topup/checkout
app.post('/api/stripe/topup/checkout', async (req, res) => {
	try {
		const user = await getSessionUser(req, res);
		const { priceId, successUrl, cancelUrl } = req.body ?? {};
		if (typeof priceId !== 'string' || !isConfiguredPrice(priceId)) {
			return res.status(400).json({ error: 'invalid_price' });
		}
		if (typeof successUrl !== 'string' || typeof cancelUrl !== 'string') {
			return res.status(400).json({ error: 'invalid_urls' });
		}
		const customerId = await ensureStripeCustomer(user.id, user.email);
		const session = await stripe.checkout.sessions.create({
			mode: 'payment',
			customer: customerId,
			success_url: successUrl,
			cancel_url: cancelUrl,
			line_items: [{ price: priceId, quantity: 1 }],
			metadata: { kind: 'topup', user_id: user.id }
		});
		res.setHeader('Cache-Control', 'no-store');
		return res.json({ url: session.url });
	} catch (e: unknown) {
		const err = e as { message?: string };
		console.error('[topup.checkout] err:', err?.message ?? e);
		if (String(err?.message).includes('UNAUTHENTICATED')) {
			return res.status(401).json({ error: 'unauthenticated' });
		}
		return res.status(500).json({ error: 'internal_error' });
	}
});

// GET /api/billing/auto-topup
app.get('/api/billing/auto-topup', async (req, res) => {
	try {
		const u = await getSessionUser(req, res);
		const s = await getSettings(u.id);
		res.setHeader('Cache-Control', 'no-store');
		return res.json({ settings: s });
	} catch (e: unknown) {
		const err = e as { message?: string; code?: string };
		const s =
			err?.code === 'UNAUTHENTICATED' || String(err?.message).includes('UNAUTHENTICATED') ? 401 : 500;
		return res.status(s).json({ error: s === 401 ? 'unauthenticated' : 'internal_error' });
	}
});

// POST /api/billing/auto-topup
app.post('/api/billing/auto-topup', async (req, res) => {
	try {
		const u = await getSessionUser(req, res);
		const { enabled, priceId, threshold, lowCreditEmailsEnabled } = req.body ?? {};
		const s = await upsertSettings(u.id, { enabled, priceId, threshold, lowCreditEmailsEnabled });
		res.setHeader('Cache-Control', 'no-store');
		return res.json({ settings: s });
	} catch (e: unknown) {
		const err = e as { message?: string; code?: string };
		const msg = String(err?.message ?? e);
		const s = msg.includes('invalid_price_id')
			? 400
			: err?.code === 'UNAUTHENTICATED' || msg.includes('UNAUTHENTICATED')
				? 401
				: 500;
		return res
			.status(s)
			.json({ error: s === 400 ? 'invalid_price_id' : s === 401 ? 'unauthenticated' : 'internal_error' });
	}
});

// GET /api/billing/purchases
app.get('/api/billing/purchases', async (req, res) => {
	try {
		const user = await getSessionUser(req, res);
		const daysParam = req.query.days ? Number.parseInt(String(req.query.days), 10) : 30;
		const limitParam = req.query.limit ? Number.parseInt(String(req.query.limit), 10) : 50;

		const days = Math.max(7, Math.min(365, Number.isFinite(daysParam) ? daysParam : 30));
		const limit = Math.max(10, Math.min(200, Number.isFinite(limitParam) ? limitParam : 50));

		const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
		const to = new Date().toISOString();

		const { data: events, error } = await admin
			.from('billing_events')
			.select('created_at, type, payload')
			.eq('user_id', user.id)
			.in('type', ['topup', 'topup_auto'])
			.gte('created_at', from)
			.lte('created_at', to)
			.order('created_at', { ascending: false })
			.limit(limit);

		if (error) {
			throw new Error(error.message);
		}

		const purchases = (events || []).map((event) => {
			const payload = (event.payload as any) || {};
			return {
				at: event.created_at,
				kind: event.type === 'topup_auto' ? ('topup_auto' as const) : ('topup' as const),
				credits: payload.credits ?? null,
				amountCents: payload.amount_cents ?? null,
				currency: payload.currency ?? null,
				receiptUrl: payload.receipt_url ?? null
			};
		});

		res.setHeader('Cache-Control', 'no-store');
		return res.json({ from, to, purchases });
	} catch (e: unknown) {
		const err = e as { message?: string; code?: string };
		const s =
			err?.code === 'UNAUTHENTICATED' || String(err?.message).includes('UNAUTHENTICATED') ? 401 : 500;
		return res.status(s).json({ error: s === 401 ? 'unauthenticated' : 'internal_error' });
	}
});

// POST /api/admin/run-monthly-grant (guarded by x-cron-secret)
app.post('/api/admin/run-monthly-grant', async (req, res) => {
	try {
		const secret = process.env.CRON_SECRET;
		const header = req.headers['x-cron-secret'];
		if (!secret || header !== secret) {
			return res.status(401).json({ error: 'unauthorized' });
		}

		const period =
			typeof req.query.period === 'string' && req.query.period.length > 0
				? req.query.period
				: currentYYYYMM();
		const limit =
			typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
		const dryRun =
			req.query.dry === '1' || req.query.dry === 'true' || req.query.dry === 'yes';

		const results = await runMonthlyGrantForAllUsers({
			period,
			limit: Number.isFinite(limit) ? limit : undefined,
			dryRun,
		});

		const summary = results.reduce(
			(acc, r) => {
				acc.total += 1;
				if (r.granted) acc.granted += 1;
				else acc.skipped += 1;
				return acc;
			},
			{ total: 0, granted: 0, skipped: 0 }
		);

		await admin.from('billing_events').insert({
			type: 'monthly_grant_run',
			user_id: null,
			payload: { summary }
		});

		res.json({ ok: true, summary });
	} catch (e: unknown) {
		const err = e as { message?: string };
		res.status(500).json({ error: String(err?.message ?? e ?? 'Internal server error') });
	}
});

// Start server
if (isDirectRun) {
	app.listen(PORT, () => {
		console.log(`[API] Server running on http://localhost:${PORT}`);
	});
}

async function handleStripeEvent(type: string, data: any, inferredUserId: string | null) {
	switch (type) {
		case 'checkout.session.completed':
			await handleCheckoutSessionEvent(data as Stripe.Checkout.Session, inferredUserId);
			break;
		case 'customer.subscription.created':
		case 'customer.subscription.updated':
		case 'customer.subscription.deleted':
			await handleSubscriptionEvent(data as Stripe.Subscription, inferredUserId);
			break;
		case 'invoice.payment_failed':
			await handleInvoicePaymentFailed(data as Stripe.Invoice, inferredUserId);
			break;
		case 'payment_intent.succeeded':
			await handlePaymentIntentSucceeded(data as Stripe.PaymentIntent, inferredUserId);
			break;
		case 'payment_intent.payment_failed':
			await handlePaymentIntentFailed(data as Stripe.PaymentIntent, inferredUserId);
			break;
		default:
			break;
	}
}

async function handleCheckoutSessionEvent(sessionData: Stripe.Checkout.Session, fallbackUserId: string | null) {
	try {
		const session = await stripe.checkout.sessions.retrieve(sessionData.id, {
			expand: ['line_items', 'subscription']
		});

		// Handle top-up payments (mode: payment, kind: topup)
		if (session.mode === 'payment' && session.metadata?.kind === 'topup') {
			await handleCheckoutCompletedTopup(session);
			return;
		}

		// Handle subscription checkouts (mode: subscription)
		const userId =
			session.client_reference_id ??
			session.metadata?.user_id ??
			fallbackUserId ??
			(await findUserIdByCustomer(session.customer as string | undefined));
		if (!userId) return;
		const subscriptionId =
			typeof session.subscription === 'string'
				? session.subscription
				: session.subscription?.id;
		if (!subscriptionId) return;
		const subscription = await stripe.subscriptions.retrieve(subscriptionId);
		const mapped = mapStripeSub(subscription);
		await normalizeUserSubscriptions({
			userId,
			stripeCustomerId:
				typeof subscription.customer === 'string'
					? subscription.customer
					: subscription.customer?.id ?? null,
			stripeSubscriptionId: subscription.id,
			plan_code: mapped.plan_code,
			status: mapped.status,
			period_start: mapped.period_start,
			period_end: mapped.period_end
		});
	} catch (error) {
		console.error('Failed to handle checkout session', error);
	}
}

async function handleCheckoutCompletedTopup(session: Stripe.Checkout.Session) {
	try {
		const kind = session.metadata?.kind;
		if (session.mode !== 'payment' || kind !== 'topup') return;

		const userId =
			(session.metadata?.user_id as string) ||
			(await findUserIdByCustomer(session.customer as string | undefined));

		// line items may not be expanded; fetch explicitly
		const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
			limit: 1,
			expand: ['data.price']
		});
		const priceId =
			(lineItems.data[0]?.price as Stripe.Price | undefined)?.id ||
			(session.metadata?.price_id as string) ||
			'';

		const credits = priceId ? creditsForPrice(priceId) : null;

		if (!userId || !priceId || !credits) {
			console.warn('[topup] Missing required data', { userId, priceId, credits });
			return;
		}

		// Fetch PaymentIntent and Charge to get amount, currency, receipt_url
		let amount: number | null = null;
		let currency: string | null = null;
		let receiptUrl: string | null = null;

		if (session.payment_intent) {
			try {
				const pi = await stripe.paymentIntents.retrieve(session.payment_intent as string, {
					expand: ['latest_charge']
				});
				amount = pi.amount ?? null;
				currency = pi.currency ?? null;
				const charge = pi.latest_charge as Stripe.Charge | null;
				if (charge && 'receipt_url' in charge) {
					receiptUrl = (charge as any).receipt_url as string | null;
				}
			} catch (err) {
				console.warn('[topup] Failed to fetch PaymentIntent details:', err);
			}
		}

		// billing_events unique index on stripe_object_id dedupes
		const enrichedPayload = {
			...session,
			amount_cents: amount,
			currency,
			receipt_url: receiptUrl,
			credits,
			price_id: priceId
		};

		const { error: billingError } = await admin.from('billing_events').insert({
			type: 'topup',
			stripe_object_id: session.id,
			user_id: userId,
			payload: enrichedPayload
		});

		if (billingError) {
			// Check if it's a unique constraint violation (already processed)
			if (
				billingError.message?.includes('billing_events_stripe_unique_idx') ||
				billingError.code === '23505'
			) {
				console.log('[topup] Already processed', session.id);
				return;
			}
			throw billingError;
		}

		// Grant credits
		await grantCredits(userId, credits, 'topup', {
			price_id: priceId,
			session_id: session.id
		});

		// Send receipt email (idempotent via email_events unique index)
		await sendTopupReceipt({
			userId,
			stripeObjectId: session.id,
			amountCents: amount,
			currency,
			credits,
			receiptUrl,
			kind: 'topup'
		}).catch((err) => {
			console.error('[topup] Failed to send receipt email:', err);
		});
	} catch (error) {
		console.error('[topup] Failed to handle top-up checkout', error);
	}
}

async function handleSubscriptionEvent(subscriptionData: Stripe.Subscription, fallbackUserId: string | null) {
	try {
		const subscription = await stripe.subscriptions.retrieve(subscriptionData.id);
		const mapped = mapStripeSub(subscription);
		await normalizeUserSubscriptions({
			userId:
				subscription.metadata?.user_id ??
				fallbackUserId ??
				(await findUserIdByCustomer(subscription.customer as string | undefined)) ??
				'',
			stripeCustomerId:
				typeof subscription.customer === 'string'
					? subscription.customer
					: subscription.customer?.id ?? null,
			stripeSubscriptionId: subscription.id,
			plan_code: mapped.plan_code,
			status: mapped.status,
			period_start: mapped.period_start,
			period_end: mapped.period_end
		});
	} catch (error) {
		console.error('Failed to handle subscription event', error);
	}
}

async function handleInvoicePaymentFailed(invoiceData: Stripe.Invoice, fallbackUserId: string | null) {
	try {
		const invoice = await stripe.invoices.retrieve(invoiceData.id);
		const userId =
			invoice.metadata?.user_id ??
			fallbackUserId ??
			(await findUserIdByCustomer(invoice.customer as string | undefined));

		if (!userId) {
			console.warn('[email] Could not resolve userId for invoice.payment_failed', invoice.id);
			return;
		}

		// Best-effort email (don't fail webhook on email errors)
		await sendPaymentFailed(userId, invoice.id, invoice.amount_due ?? 0).catch((err) => {
			console.error('[email] Payment failed notification error:', err);
		});
	} catch (error) {
		console.error('Failed to handle invoice.payment_failed event', error);
	}
}

async function handlePaymentIntentSucceeded(
	piData: Stripe.PaymentIntent,
	fallbackUserId: string | null
) {
	try {
		const pi = await stripe.paymentIntents.retrieve(piData.id);
		const kind = pi.metadata?.kind;

		if (kind !== 'topup_auto') return;

		const userId = (pi.metadata?.user_id as string) || fallbackUserId || (await findUserIdByCustomer(pi.customer as string | undefined));

		if (!userId) {
			console.warn('[auto-topup] Could not resolve userId for payment_intent.succeeded', pi.id);
			return;
		}

		const priceId = (pi.metadata?.price_id as string) || '';
		const credits = priceId ? creditsForPrice(priceId) : null;

		if (!priceId || !credits) {
			console.warn('[auto-topup] Missing price_id or credits', { priceId, credits });
			return;
		}

		// Fetch Charge to get receipt_url
		let amount: number | null = pi.amount ?? null;
		let currency: string | null = pi.currency ?? null;
		let receiptUrl: string | null = null;

		try {
			const expandedPi = await stripe.paymentIntents.retrieve(pi.id, {
				expand: ['latest_charge']
			});
			amount = expandedPi.amount ?? null;
			currency = expandedPi.currency ?? null;
			const charge = expandedPi.latest_charge as Stripe.Charge | null;
			if (charge && 'receipt_url' in charge) {
				receiptUrl = (charge as any).receipt_url as string | null;
			}
		} catch (err) {
			console.warn('[auto-topup] Failed to fetch Charge details:', err);
		}

		// Idempotently log event (unique stripe_object_id prevents duplicates)
		const enrichedPayload = {
			...pi,
			amount_cents: amount,
			currency,
			receipt_url: receiptUrl,
			credits,
			price_id: priceId
		};

		const { error: billingError } = await admin.from('billing_events').insert({
			type: 'topup_auto',
			stripe_object_id: pi.id,
			user_id: userId,
			payload: enrichedPayload
		});

		if (billingError) {
			// Check if it's a unique constraint violation (already processed)
			if (
				billingError.message?.includes('billing_events_stripe_unique_idx') ||
				billingError.code === '23505'
			) {
				console.log('[auto-topup] Already processed', pi.id);
				return;
			}
			throw billingError;
		}

		// Grant credits
		await grantCredits(userId, credits, 'topup_auto', {
			price_id: priceId,
			payment_intent_id: pi.id
		});

		// Send receipt email (idempotent via email_events unique index)
		await sendTopupReceipt({
			userId,
			stripeObjectId: pi.id,
			amountCents: amount,
			currency,
			credits,
			receiptUrl,
			kind: 'topup_auto'
		}).catch((err) => {
			console.error('[auto-topup] Failed to send receipt email:', err);
		});
	} catch (error) {
		console.error('[auto-topup] Failed to handle payment_intent.succeeded', error);
	}
}

async function handlePaymentIntentFailed(piData: Stripe.PaymentIntent, fallbackUserId: string | null) {
	try {
		const pi = await stripe.paymentIntents.retrieve(piData.id);
		const kind = pi.metadata?.kind;

		if (kind !== 'topup_auto') return;

		const userId = (pi.metadata?.user_id as string) || fallbackUserId || (await findUserIdByCustomer(pi.customer as string | undefined));

		if (!userId) {
			console.warn('[auto-topup] Could not resolve userId for payment_intent.payment_failed', pi.id);
			return;
		}

		// Log failure event (idempotent via unique stripe_object_id)
		const { error: billingError } = await admin.from('billing_events').insert({
			type: 'topup_auto_failed',
			stripe_object_id: pi.id,
			user_id: userId,
			payload: pi
		});

		if (billingError) {
			// Already logged, skip
			if (
				billingError.message?.includes('billing_events_stripe_unique_idx') ||
				billingError.code === '23505'
			) {
				return;
			}
			throw billingError;
		}

		// Optionally send payment failed email
		if (pi.amount) {
			await sendPaymentFailed(userId, pi.id, pi.amount).catch((err) => {
				console.error('[email] Auto top-up payment failed notification error:', err);
			});
		}
	} catch (error) {
		console.error('[auto-topup] Failed to handle payment_intent.payment_failed', error);
	}
}

async function resolveUserIdFromEvent(data: any): Promise<string | null> {
	const metadataUser =
		data?.metadata?.user_id ?? data?.metadata?.userId ?? data?.metadata?.uid ?? null;
	if (metadataUser) return metadataUser;
	if (data?.client_reference_id) return data.client_reference_id;
	const customerId: string | undefined =
		typeof data?.customer === 'string' ? data.customer : undefined;
	if (customerId) {
		return findUserIdByCustomer(customerId);
	}
	return null;
}

async function findUserIdByCustomer(customerId?: string): Promise<string | null> {
	if (!customerId) return null;
	const { data } = await admin
		.from('subscriptions')
		.select('user_id')
		.eq('stripe_customer_id', customerId)
		.order('created_at', { ascending: false })
		.limit(1);
	if (data && data.length > 0) {
		return data[0].user_id as string;
	}
	return null;
}

function mapStripeStatus(status: string | null | undefined) {
	const mapping: Record<string, string> = {
		active: 'active',
		trialing: 'trialing',
		past_due: 'past_due',
		canceled: 'canceled',
		incomplete: 'incomplete',
		incomplete_expired: 'incomplete_expired',
		unpaid: 'unpaid',
		paused: 'paused'
	};
	return (status && mapping[status]) || 'incomplete';
}

function toIso(value?: number | null) {
	if (!value) return null;
	return new Date(value * 1000).toISOString();
}

function serializeStripeData(data: any) {
	return JSON.parse(JSON.stringify(data));
}

function dayKey(date: Date): string {
	const copy = new Date(date);
	copy.setUTCHours(0, 0, 0, 0);
	return copy.toISOString();
}

function currentYYYYMM(): string {
	const now = new Date();
	const year = now.getUTCFullYear();
	const month = String(now.getUTCMonth() + 1).padStart(2, '0');
	return `${year}-${month}`;
}



