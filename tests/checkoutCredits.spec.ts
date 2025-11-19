import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET as getPackages } from '@/app/api/credit-packages/route';
import { POST as postCheckout } from '@/app/api/checkout/credits/route';

vi.mock('@/server/auth', () => ({
	getSessionUser: vi.fn()
}));

vi.mock('@/server/services/creditPackagesAdmin', () => ({
	getCreditPackageById: vi.fn(),
	listPublicCreditPackages: vi.fn()
}));

vi.mock('@/server/services/userProfile', () => ({
	getUserBillingProfile: vi.fn(),
	updateUserStripeCustomerId: vi.fn()
}));

vi.mock('@/lib/stripe', () => {
	return {
		stripe: {
			customers: {
				create: vi.fn()
			},
			checkout: {
				sessions: {
					create: vi.fn()
				}
			}
		}
	};
});

const mockSessionUser = vi.mocked(
	await import('@/server/auth').then((mod) => mod.getSessionUser)
);
const mockGetPackage = vi.mocked(
	await import('@/server/services/creditPackagesAdmin').then((mod) => mod.getCreditPackageById)
);
const mockListPublicPackages = vi.mocked(
	await import('@/server/services/creditPackagesAdmin').then((mod) => mod.listPublicCreditPackages)
);
const mockGetUserProfile = vi.mocked(
	await import('@/server/services/userProfile').then((mod) => mod.getUserBillingProfile)
);
const mockUpdateStripeCustomerId = vi.mocked(
	await import('@/server/services/userProfile').then((mod) => mod.updateUserStripeCustomerId)
);
const stripeModule = await import('@/lib/stripe');

beforeEach(() => {
	vi.clearAllMocks();
	process.env.APP_BASE_URL = 'http://localhost:3000';
});

describe('GET /api/credit-packages', () => {
	it('returns active packages only', async () => {
		mockListPublicPackages.mockResolvedValue([
			{ id: 'pkg_1', name: 'Starter', credits_amount: 100, price_usd: 10 },
			{ id: 'pkg_2', name: 'Pro', credits_amount: 500, price_usd: 45 }
		]);
		const request = new Request('http://localhost/api/credit-packages', { method: 'GET' });
		const response = (await getPackages(request as any)) as { status: number; body: unknown };
		expect(response.status).toBe(200);
		const json = response.body as { packages: { id: string }[] };
		expect(json.packages).toHaveLength(2);
		expect(json.packages[0]).not.toHaveProperty('stripe_price_id');
	});
});

describe('POST /api/checkout/credits', () => {
	const createRequest = (body: unknown) =>
		new Request('http://localhost/api/checkout/credits', {
			method: 'POST',
			body: JSON.stringify(body),
			headers: { 'Content-Type': 'application/json' }
		});

	it('returns 401 when unauthenticated', async () => {
		mockSessionUser.mockRejectedValue(new Error('UNAUTHENTICATED'));
		const response = (await postCheckout(createRequest({ packageId: 'pkg_1' }) as any)) as {
			status: number;
		};
		expect(response.status).toBe(401);
	});

	it('returns 400 when package inactive or missing price', async () => {
		mockSessionUser.mockResolvedValue({ id: 'user_1', email: 'user@example.com' });
		mockGetPackage.mockResolvedValue({
			id: 'pkg_inactive',
			name: 'Inactive',
			credits_amount: 100,
			bonus_credits: 0,
			price_usd: 10,
			stripe_price_id: null,
			is_active: false
		});
		const response = (await postCheckout(createRequest({ packageId: 'pkg_inactive' }) as any)) as {
			status: number;
		};
		expect(response.status).toBe(400);
	});

	it('creates a checkout session and returns url', async () => {
		mockSessionUser.mockResolvedValue({ id: 'user_1', email: 'user@example.com' });
		mockGetPackage.mockResolvedValue({
			id: 'pkg_ok',
			name: 'Starter Credits',
			credits_amount: 100,
			bonus_credits: 10,
			price_usd: 10,
			stripe_price_id: 'price_123',
			is_active: true
		});
		mockGetUserProfile.mockResolvedValue({
			id: 'user_1',
			email: 'user@example.com',
			billing_email: 'billing@example.com',
			stripe_customer_id: null
		});
		vi.mocked(stripeModule.stripe.customers.create).mockResolvedValue({ id: 'cus_123' } as any);
		vi.mocked(stripeModule.stripe.checkout.sessions.create).mockResolvedValue({
			url: 'https://checkout.stripe.com/test'
		} as any);

		const response = (await postCheckout(createRequest({ packageId: 'pkg_ok' }) as any)) as {
			status: number;
			body: { url: string };
		};
		expect(response.status).toBe(200);
		expect(response.body.url).toContain('https://checkout.stripe.com');
		expect(stripeModule.stripe.checkout.sessions.create).toHaveBeenCalledWith(
			expect.objectContaining({
				customer: 'cus_123',
				line_items: [{ price: 'price_123', quantity: 1 }]
			})
		);
		expect(mockUpdateStripeCustomerId).toHaveBeenCalledWith('user_1', 'cus_123');
	});
});


