import { describe, it, expect, vi } from 'vitest';
import { upsertDefaultCreditPackages, DEFAULT_CREDIT_PACKAGES } from '../server/seeds/seedCreditPackages';
import {
	updateCreditPackageById,
	verifyStripePriceId
} from '@/server/services/creditPackagesAdmin';

describe('credit package seeding', () => {
	it('upserts the default packages', async () => {
		const inserts: Record<string, unknown>[] = [];
		const client = {
			from: () => ({
				upsert: async (payload: Record<string, unknown>) => {
					inserts.push(payload);
					return { error: null };
				}
			})
		};

		await upsertDefaultCreditPackages(client as any);
		expect(inserts).toHaveLength(DEFAULT_CREDIT_PACKAGES.length);
		expect(inserts[0]).toMatchObject({
			name: 'Starter Credits 100',
			credits_amount: 100,
			is_active: false
		});
	});
});

describe('admin update + verify helpers', () => {
	it('updates stripe_price_id via Supabase client', async () => {
		const payloads: Record<string, unknown>[] = [];
		const mockClient = {
			from: () => ({
				update: (payload: Record<string, unknown>) => {
					payloads.push(payload);
					return {
						eq: () => ({
							select: () => ({
								single: async () => ({
									data: {
										id: 'pkg_1',
										name: 'Starter Credits 100',
										credits_amount: 100,
										price_usd: 0,
										stripe_price_id: payload.stripe_price_id ?? null,
										is_active: false
									},
									error: null
								})
							})
						})
					};
				}
			})
		};

		const result = await updateCreditPackageById(
			'pkg_1',
			{ stripe_price_id: 'price_123' },
			mockClient as any
		);

		expect(payloads).toEqual([{ stripe_price_id: 'price_123' }]);
		expect(result.stripe_price_id).toBe('price_123');
	});

	it('returns ok=true when Stripe verification succeeds', async () => {
		const stripeMock = {
			prices: {
				retrieve: vi.fn(async () => ({
					id: 'price_ok',
					currency: 'usd',
					unit_amount: 2500,
					product: { id: 'prod_ok', name: 'Pro Credits' }
				}))
			}
		};

		const result = await verifyStripePriceId('price_ok', stripeMock as any);
		expect(result.ok).toBe(true);
		expect(result.productName).toBe('Pro Credits');
		expect(stripeMock.prices.retrieve).toHaveBeenCalledWith('price_ok', {
			expand: ['product']
		});
	});

	it('returns ok=false when Stripe verification fails', async () => {
		const stripeMock = {
			prices: {
				retrieve: vi.fn(async () => {
					throw new Error('No such price');
				})
			}
		};

		const result = await verifyStripePriceId('price_missing', stripeMock as any);
		expect(result.ok).toBe(false);
		expect(result.message).toContain('No such price');
	});
});


