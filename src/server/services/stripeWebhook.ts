import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { admin } from '@/server/supabaseAdmin';
import { addCredits, type CreditTransactionResult } from '@/server/services/creditService';
import { getCreditPackagesByPriceIds, type CreditPackage } from '@/server/services/creditPackagesAdmin';

type CheckoutSessionWithItems = Stripe.Checkout.Session & {
	line_items?: {
		data: Stripe.LineItem[];
	};
};

type BillingEventInsert = {
	user_id: string | null;
	event_type: string;
	stripe_event_id: string;
	amount: number | null;
	currency: string | null;
	status: 'succeeded' | 'error';
	metadata: Record<string, unknown>;
};

type BillingEventInsertResult = {
	id: string;
	metadata: Record<string, unknown> | null;
};

type StripeWebhookDeps = {
	retrieveSession: (sessionId: string) => Promise<CheckoutSessionWithItems>;
	findPackagesByPriceIds: (priceIds: string[]) => Promise<CreditPackage[]>;
	insertBillingEvent: (payload: BillingEventInsert) => Promise<BillingEventInsertResult | 'conflict'>;
	updateBillingEventMetadata: (id: string, metadata: Record<string, unknown>) => Promise<void>;
	addCreditsFn: (
		userId: string,
		amount: number,
		description: string,
		txType: 'purchase' | 'grant' | 'refund' | 'monthly_reset'
	) => Promise<CreditTransactionResult>;
};

let overrides: Partial<StripeWebhookDeps> | null = null;

export function setStripeWebhookDeps(mockDeps: Partial<StripeWebhookDeps> | null) {
	overrides = mockDeps;
}

function getDeps(): StripeWebhookDeps {
	return {
		retrieveSession:
			overrides?.retrieveSession ??
			((sessionId: string) =>
				stripe.checkout.sessions.retrieve(sessionId, {
					expand: ['line_items.data.price.product']
				})),
		findPackagesByPriceIds: overrides?.findPackagesByPriceIds ?? ((ids) => getCreditPackagesByPriceIds(ids)),
		insertBillingEvent: overrides?.insertBillingEvent ?? insertBillingEvent,
		updateBillingEventMetadata: overrides?.updateBillingEventMetadata ?? updateBillingEventMetadata,
		addCreditsFn: overrides?.addCreditsFn ?? ((...args) => addCredits(...args))
	};
}

export async function processStripeEvent(event: Stripe.Event): Promise<void> {
	if (event.type !== 'checkout.session.completed') {
		console.info('[stripe-webhook] Ignoring event type', { eventId: event.id, type: event.type });
		return;
	}

	const session = event.data.object as Stripe.Checkout.Session;
	if (session.mode !== 'payment') {
		console.info('[stripe-webhook] Unsupported checkout mode', {
			eventId: event.id,
			mode: session.mode
		});
		return;
	}

	const userId = session.client_reference_id ?? session.metadata?.userId ?? null;
	const deps = getDeps();

	const fullSession = await deps.retrieveSession(session.id);
	const lineItems = fullSession.line_items?.data ?? [];

	const priceIds = Array.from(
		new Set(
			lineItems
				.map((item) => item.price?.id)
				.filter((value): value is string => Boolean(value))
		)
	);

	const packages = priceIds.length > 0 ? await deps.findPackagesByPriceIds(priceIds) : [];
	const packageMap = new Map<string, CreditPackage>(
		packages
			.filter((pkg) => pkg.stripe_price_id)
			.map((pkg) => [pkg.stripe_price_id as string, pkg])
	);

	const lineItemSummaries = lineItems.map((item) => {
		const priceId = item.price?.id ?? null;
		const pkg = priceId ? packageMap.get(priceId) : undefined;
		const quantity = typeof item.quantity === 'number' ? item.quantity : 1;
		const creditsBase = pkg?.credits_amount ?? 0;
		const bonus = pkg?.bonus_credits ?? 0;
		const creditsGranted = (creditsBase + bonus) * quantity;
		return {
			price_id: priceId,
			quantity,
			package_id: pkg?.id ?? null,
			credits_amount: creditsBase,
			bonus_credits: bonus,
			credits_granted: creditsGranted
		};
	});

	const totalCredits = lineItemSummaries.reduce(
		(sum, item) => sum + (typeof item.credits_granted === 'number' ? item.credits_granted : 0),
		0
	);

	const baseMetadata: Record<string, unknown> = {
		source: 'checkout.session.completed',
		session_id: session.id,
		customer_id: session.customer ?? null,
		price_ids: priceIds,
		line_items: lineItemSummaries
	};

	if (!userId) {
		await deps.insertBillingEvent({
			user_id: null,
			event_type: 'payment_succeeded',
			stripe_event_id: event.id,
			amount: amountFromSession(session),
			currency: session.currency ?? null,
			status: 'error',
			metadata: {
				...baseMetadata,
				error: 'missing_user_id'
			}
		});
		console.warn('[stripe-webhook] Missing user id for checkout session', {
			eventId: event.id,
			sessionId: session.id
		});
		return;
	}

	const insertResult = await deps.insertBillingEvent({
		user_id: userId,
		event_type: 'payment_succeeded',
		stripe_event_id: event.id,
		amount: amountFromSession(session),
		currency: session.currency ?? null,
		status: 'succeeded',
		metadata: {
			...baseMetadata,
			user_id: userId
		}
	});

	if (insertResult === 'conflict') {
		console.info('[stripe-webhook] Duplicate event ignored', { eventId: event.id });
		return;
	}

	const creditTransactionIds: string[] = [];

	if (totalCredits > 0) {
		try {
			const creditResult = await deps.addCreditsFn(
				userId,
				totalCredits,
				'Purchase: credit package(s)',
				'purchase'
			);
			creditTransactionIds.push(creditResult.transactionId);
		} catch (error) {
			console.error('[stripe-webhook] Failed to add credits', {
				eventId: event.id,
				userId,
				message: error instanceof Error ? error.message : String(error)
			});
			throw error;
		}
	} else {
		console.warn('[stripe-webhook] No credits matched for checkout session', {
			eventId: event.id,
			sessionId: session.id
		});
	}

	const updatedMetadata = {
		...(insertResult.metadata ?? baseMetadata),
		credit_transaction_ids: creditTransactionIds,
		total_credits: totalCredits
	};
	await deps.updateBillingEventMetadata(insertResult.id, updatedMetadata);
	console.info('[stripe-webhook] Checkout session processed', {
		eventId: event.id,
		userId,
		totalCredits
	});
}

async function insertBillingEvent(payload: BillingEventInsert): Promise<BillingEventInsertResult | 'conflict'> {
	const { data, error } = await admin
		.from('billing_events')
		.insert(payload)
		.select('id, metadata')
		.single();

	if (error) {
		if (error.code === '23505') {
			return 'conflict';
		}
		throw new Error(`Failed to insert billing event: ${error.message}`);
	}

	return { id: data.id as string, metadata: (data.metadata as Record<string, unknown>) ?? null };
}

async function updateBillingEventMetadata(id: string, metadata: Record<string, unknown>): Promise<void> {
	const { error } = await admin.from('billing_events').update({ metadata }).eq('id', id);
	if (error) {
		throw new Error(`Failed to update billing event metadata: ${error.message}`);
	}
}

function amountFromSession(session: Stripe.Checkout.Session): number | null {
	if (typeof session.amount_total === 'number') {
		return session.amount_total / 100;
	}
	return null;
}


