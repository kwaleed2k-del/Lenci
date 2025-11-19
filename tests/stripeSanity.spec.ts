import { describe, it, expect, beforeEach, vi } from 'vitest';

type PricesRetrieveResponse = {
	id: string;
	currency: string | null;
	unit_amount: number | null;
	product: { id: string; name?: string } | string;
};

type StripeLike = {
	prices: {
		retrieve: (id: string, params?: Record<string, unknown>) => Promise<PricesRetrieveResponse>;
	};
};

function createStripeMock(response: PricesRetrieveResponse | null): StripeLike {
	return {
		prices: {
			retrieve: vi.fn(async (id: string) => {
				if (!response) {
					throw new Error(`Missing mock for price ${id}`);
				}
				return response;
			})
		}
	};
}

beforeEach(() => {
	process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
	process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_dummy';
	process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';
	process.env.INTERNAL_ADMIN_TOKEN = 'admin_dummy';
	process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
	process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_dummy';
});

describe('stripe sanity checks', () => {
	it('detects test mode from env keys', async () => {
		vi.resetModules();
		const stripeMock = createStripeMock({
			id: 'price_123',
			currency: 'usd',
			unit_amount: 5000,
			product: { id: 'prod_123', name: 'Gold' }
		});

		const { runStripeSanityChecks } = await import('@/server/services/stripeSanity');

		const result = await runStripeSanityChecks({
			stripeClient: stripeMock,
			fetchActivePackages: async () => [],
			checkBillingEventsUnique: async () => true
		});

		expect(result.report.mode).toBe('test');
	});

	it('marks packages missing price id as Empty and forces CLI failure', async () => {
		vi.resetModules();
		const stripeMock = createStripeMock({
			id: 'price_mock',
			currency: 'usd',
			unit_amount: 1000,
			product: { id: 'prod_mock', name: 'Mock Product' }
		});
		const { runStripeSanityChecks } = await import('@/server/services/stripeSanity');
		const { stripeSanityCliMain } = await import('../server/tools/stripeSanity');

		const sanity = await runStripeSanityChecks({
			stripeClient: stripeMock,
			fetchActivePackages: async () => [
				{
					id: 'pkg_empty',
					name: 'Empty Price',
					stripe_price_id: null,
					is_active: true
				}
			],
			checkBillingEventsUnique: async () => true
		});

		expect(sanity.report.packages).toHaveLength(1);
		expect(sanity.report.packages[0].verified).toBe('Empty');
		expect(sanity.hasBlockingIssues).toBe(true);

		const exitCode = await stripeSanityCliMain({
			runner: async () => sanity
		});
		expect(exitCode).toBe(1);
	});

	it('verifies Stripe prices with OK status when retrievable', async () => {
		vi.resetModules();
		const stripeMock = createStripeMock({
			id: 'price_ok',
			currency: 'usd',
			unit_amount: 2500,
			product: { id: 'prod_ok', name: 'Pro Package' }
		});

		const { runStripeSanityChecks } = await import('@/server/services/stripeSanity');

		const sanity = await runStripeSanityChecks({
			stripeClient: stripeMock,
			fetchActivePackages: async () => [
				{
					id: 'pkg_ok',
					name: 'OK Package',
					stripe_price_id: 'price_ok',
					is_active: true
				}
			],
			checkBillingEventsUnique: async () => true
		});

		expect(sanity.report.packages[0]).toMatchObject({
			id: 'pkg_ok',
			priceId: 'price_ok',
			verified: 'OK',
			productName: 'Pro Package',
			currency: 'usd',
			unitAmount: 2500
		});
	});
});


