import { describe, it, expect, beforeEach, vi } from 'vitest';
import type Stripe from 'stripe';
import { POST as WebhookRoute } from '@/app/api/stripe/webhooks/route';
import { processStripeEvent, setStripeWebhookDeps } from '@/server/services/stripeWebhook';

const mockConstructEvent = vi.fn();
const mockRetrieveSession = vi.fn();

vi.mock('@/lib/stripe', () => {
	return {
		stripe: {
			webhooks: {
				constructEvent: (...args: unknown[]) => mockConstructEvent(...args)
			},
			checkout: {
				sessions: {
					retrieve: (...args: unknown[]) => mockRetrieveSession(...args)
				}
			}
		}
	};
});

beforeEach(() => {
	vi.resetAllMocks();
	setStripeWebhookDeps(null);
	process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
});

describe('Stripe webhook route', () => {
	it('returns 400 on invalid signature', async () => {
		mockConstructEvent.mockImplementation(() => {
			throw new Error('Invalid signature');
		});

		const request = new Request('http://localhost/api/stripe/webhooks', {
			method: 'POST',
			headers: { 'stripe-signature': 'bad' },
			body: JSON.stringify({})
		});

		const response = await WebhookRoute(request as any);
		expect(response.status).toBe(400);
	});
});

describe('processStripeEvent', () => {
	const baseEvent = (overrides?: Partial<Stripe.Event>): Stripe.Event => ({
		id: 'evt_test',
		type: 'checkout.session.completed',
		data: {
			object: {
				id: 'cs_test',
				mode: 'payment',
				client_reference_id: 'user_1',
				amount_total: 5000,
				currency: 'usd',
				metadata: { userId: 'user_1' }
			}
		},
		...overrides
	}) as Stripe.Event;

	const mockDeps = () => {
		const insertBillingEvent = vi.fn().mockResolvedValue({ id: 'billing_1', metadata: {} });
		const updateBillingEventMetadata = vi.fn().mockResolvedValue(undefined);
		const addCreditsFn = vi.fn().mockResolvedValue({ transactionId: 'tx_1', balanceAfter: 100 });
		setStripeWebhookDeps({
			retrieveSession: async () =>
				({
					id: 'cs_test',
					line_items: {
						data: [
							{
								price: { id: 'price_basic' },
								quantity: 1
							} as Stripe.LineItem
						]
					},
					amount_total: 5000,
					currency: 'usd'
				}) as Stripe.Checkout.Session,
			findPackagesByPriceIds: async () => [
				{
					id: 'pkg_basic',
					name: 'Basic 100',
					credits_amount: 100,
					bonus_credits: 10,
					price_usd: 10,
					stripe_price_id: 'price_basic',
					is_active: true
				}
			],
			insertBillingEvent,
			updateBillingEventMetadata,
			addCreditsFn
		});
		return { insertBillingEvent, updateBillingEventMetadata, addCreditsFn };
	};

	it('grants credits and records billing event for checkout.session.completed', async () => {
		const { insertBillingEvent, updateBillingEventMetadata, addCreditsFn } = mockDeps();
		await processStripeEvent(baseEvent());
		expect(insertBillingEvent).toHaveBeenCalledWith(
			expect.objectContaining({ stripe_event_id: 'evt_test', status: 'succeeded' })
		);
		expect(addCreditsFn).toHaveBeenCalledWith('user_1', 110, 'Purchase: credit package(s)', 'purchase');
		expect(updateBillingEventMetadata).toHaveBeenCalledWith(
			'billing_1',
			expect.objectContaining({
				total_credits: 110,
				credit_transaction_ids: ['tx_1']
			})
		);
	});

	it('skips granting when billing event already exists', async () => {
		const { insertBillingEvent, addCreditsFn } = mockDeps();
		insertBillingEvent.mockResolvedValueOnce('conflict');
		await processStripeEvent(baseEvent());
		expect(addCreditsFn).not.toHaveBeenCalled();
	});

	it('sums credits across multiple line items and bonus values', async () => {
		const insertBillingEvent = vi.fn().mockResolvedValue({ id: 'billing_multi', metadata: {} });
		const updateBillingEventMetadata = vi.fn().mockResolvedValue(undefined);
		const addCreditsFn = vi.fn().mockResolvedValue({ transactionId: 'tx_multi', balanceAfter: 500 });

		setStripeWebhookDeps({
			retrieveSession: async () =>
				({
					id: 'cs_multi',
					line_items: {
						data: [
							{
								price: { id: 'price_a' },
								quantity: 2
							} as Stripe.LineItem,
							{
								price: { id: 'price_b' },
								quantity: 1
							} as Stripe.LineItem
						]
					},
					amount_total: 12000,
					currency: 'usd'
				}) as Stripe.Checkout.Session,
			findPackagesByPriceIds: async () => [
				{
					id: 'pkg_a',
					name: 'A',
					credits_amount: 50,
					bonus_credits: 10,
					price_usd: 20,
					stripe_price_id: 'price_a',
					is_active: true
				},
				{
					id: 'pkg_b',
					name: 'B',
					credits_amount: 200,
					bonus_credits: 0,
					price_usd: 80,
					stripe_price_id: 'price_b',
					is_active: true
				}
			],
			insertBillingEvent,
			updateBillingEventMetadata,
			addCreditsFn
		});

		await processStripeEvent(baseEvent());
		expect(addCreditsFn).toHaveBeenCalledWith('user_1', 320, 'Purchase: credit package(s)', 'purchase');
		expect(updateBillingEventMetadata).toHaveBeenCalledWith(
			'billing_multi',
			expect.objectContaining({ total_credits: 320 })
		);
	});

	it('records billing event but does not crash when a price has no package match', async () => {
		const insertBillingEvent = vi.fn().mockResolvedValue({ id: 'billing_partial', metadata: {} });
		const updateBillingEventMetadata = vi.fn().mockResolvedValue(undefined);
		const addCreditsFn = vi.fn().mockResolvedValue({ transactionId: 'tx_partial', balanceAfter: 300 });

		setStripeWebhookDeps({
			retrieveSession: async () =>
				({
					id: 'cs_partial',
					line_items: {
						data: [
							{
								price: { id: 'price_known' },
								quantity: 1
							} as Stripe.LineItem,
							{
								price: { id: 'price_unknown' },
								quantity: 1
							} as Stripe.LineItem
						]
					},
					amount_total: 5000,
					currency: 'usd'
				}) as Stripe.Checkout.Session,
			findPackagesByPriceIds: async () => [
				{
					id: 'pkg_known',
					name: 'Known',
					credits_amount: 150,
					bonus_credits: 0,
					price_usd: 50,
					stripe_price_id: 'price_known',
					is_active: true
				}
			],
			insertBillingEvent,
			updateBillingEventMetadata,
			addCreditsFn
		});

		await processStripeEvent(baseEvent());
		expect(addCreditsFn).toHaveBeenCalledWith('user_1', 150, 'Purchase: credit package(s)', 'purchase');
		expect(updateBillingEventMetadata).toHaveBeenCalledWith(
			'billing_partial',
			expect.objectContaining({ total_credits: 150 })
		);
	});
});


