/**
 * Auto top-up service - automatically purchase credits when balance drops below threshold.
 * Server-only; requires SUPABASE_SERVICE_ROLE_KEY.
 */
import Stripe from 'stripe';
import { admin } from '../supabaseAdmin';
import { stripe } from './stripeService';
import { isConfiguredPrice, creditsForPrice } from '../config/stripeTopups';
import { grant as grantCredits } from './creditService';

export type AutoTopupSettings = {
	enabled: boolean;
	priceId: string | null;
	threshold: number;
	lowCreditEmailsEnabled: boolean;
};

export async function getSettings(userId: string): Promise<AutoTopupSettings> {
	const { data, error } = await admin
		.from('auto_topup_settings')
		.select('enabled, price_id, threshold, low_credit_emails_enabled')
		.eq('user_id', userId)
		.maybeSingle();

	if (error) throw new Error(error.message);

	return {
		enabled: data?.enabled ?? false,
		priceId: (data?.price_id as string | null) ?? null,
		threshold: Number.isFinite(data?.threshold) ? (data!.threshold as number) : 10,
		lowCreditEmailsEnabled: data?.low_credit_emails_enabled ?? true
	};
}

export async function upsertSettings(
	userId: string,
	patch: Partial<AutoTopupSettings>
): Promise<AutoTopupSettings> {
	const next: Record<string, unknown> = {};

	if (typeof patch.enabled === 'boolean') next.enabled = patch.enabled;

	if (typeof patch.threshold === 'number') {
		const t = Math.max(1, Math.min(10000, Math.floor(patch.threshold)));
		next.threshold = t;
	}

	if (patch.priceId !== undefined) {
		if (patch.priceId === null) {
			next.price_id = null;
		} else if (typeof patch.priceId === 'string' && isConfiguredPrice(patch.priceId)) {
			next.price_id = patch.priceId;
		} else {
			throw new Error('invalid_price_id');
		}
	}

	if (typeof patch.lowCreditEmailsEnabled === 'boolean') {
		next.low_credit_emails_enabled = patch.lowCreditEmailsEnabled;
	}

	const { data, error } = await admin
		.from('auto_topup_settings')
		.upsert({ user_id: userId, ...next }, { onConflict: 'user_id' })
		.select('enabled, price_id, threshold, low_credit_emails_enabled')
		.single();

	if (error) throw new Error(error.message);

	return {
		enabled: data.enabled as boolean,
		priceId: (data.price_id as string | null) ?? null,
		threshold: data.threshold as number,
		lowCreditEmailsEnabled: data.low_credit_emails_enabled as boolean
	};
}

// Returns 'skipped' | 'no_payment_method' | 'granted'
export async function maybeAutoTopup(
	userId: string,
	currentBalance: number
): Promise<'skipped' | 'no_payment_method' | 'granted'> {
	const s = await getSettings(userId);
	if (!s.enabled || !s.priceId || currentBalance >= s.threshold) return 'skipped';

	const credits = creditsForPrice(s.priceId);
	if (!credits) return 'skipped';

	// Check customer + default payment method
	const { data: sub, error: e1 } = await admin
		.from('subscriptions')
		.select('stripe_customer_id')
		.eq('user_id', userId)
		.limit(1)
		.maybeSingle();

	if (e1) throw new Error(e1.message);

	const customerId = sub?.stripe_customer_id as string | null;
	if (!customerId) return 'no_payment_method';

	const cust = await stripe.customers.retrieve(customerId);
	const defaultPm =
		(cust as Stripe.Customer).invoice_settings?.default_payment_method ?? null;
	if (!defaultPm) return 'no_payment_method';

	// Get price for amount/currency
	const price = await stripe.prices.retrieve(s.priceId);
	if (!price.unit_amount || !price.currency) return 'skipped';

	// Idempotency: avoid rapid duplicate charges by checking recent billing_events for this user/type in last 10 min
	const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
	const { data: recent } = await admin
		.from('billing_events')
		.select('id')
		.eq('user_id', userId)
		.eq('type', 'topup_auto')
		.gte('created_at', since)
		.limit(1);

	if (recent && recent.length > 0) return 'skipped';

	// Create & confirm PaymentIntent off-session
	const pi = await stripe.paymentIntents.create({
		amount: price.unit_amount,
		currency: price.currency,
		customer: customerId,
		payment_method: typeof defaultPm === 'string' ? defaultPm : (defaultPm as any).id,
		off_session: true,
		confirm: true,
		description: `Auto Top-Up (${credits} credits)`,
		metadata: { kind: 'topup_auto', user_id: userId, price_id: s.priceId }
	});

	// Log + grant credits idempotently (billing_events unique on stripe_object_id)
	await upsertBillingEvent({
		userId,
		type: 'topup_auto',
		stripeObjectId: pi.id,
		payload: pi
	});

	await grantCredits(userId, credits, 'topup_auto', {
		price_id: s.priceId,
		payment_intent_id: pi.id
	});

	return 'granted';
}

// Helper: minimal upsert for billing_events (same style used elsewhere)
async function upsertBillingEvent(args: {
	userId: string;
	type: string;
	stripeObjectId: string;
	payload: any;
}) {
	const { error } = await admin.from('billing_events').insert({
		user_id: args.userId,
		type: args.type,
		stripe_object_id: args.stripeObjectId,
		payload: args.payload
	});

	if (error && !String(error.message).includes('duplicate key') && !String(error.message).includes('billing_events_stripe_unique_idx')) {
		throw new Error(error.message);
	}
}

