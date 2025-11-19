/**
 * Stripe top-up configuration - maps Price IDs to credit amounts.
 * Format: STRIPE_TOPUPS="price_xxx:100,price_yyy:500"
 */
import Stripe from 'stripe';
import { stripe } from '../services/stripeService';

export type TopupOption = {
	priceId: string;
	credits: number;
	label: string; // e.g., "Buy 500 credits"
	currency: string; // normalized from Stripe
	unitAmount: number; // cents
};

// STRIPE_TOPUPS format: "price_xxx:100,price_yyy:500"
function parseMap(envVal: string | undefined): Record<string, number> {
	const m: Record<string, number> = {};
	if (!envVal) return m;
	for (const pair of envVal.split(',').map((s) => s.trim()).filter(Boolean)) {
		const [price, creditsRaw] = pair.split(':').map((s) => s.trim());
		const credits = Number(creditsRaw);
		if (price && Number.isFinite(credits) && credits > 0) m[price] = credits;
	}
	return m;
}

const MAP = parseMap(process.env.STRIPE_TOPUPS);

export function isConfiguredPrice(priceId: string): boolean {
	return Boolean(MAP[priceId]);
}

export function creditsForPrice(priceId: string): number | null {
	return MAP[priceId] ?? null;
}

// Resolve display info from Stripe prices (cached per process)
let _cache: Promise<TopupOption[]> | null = null;

export async function listTopupOptions(): Promise<TopupOption[]> {
	if (_cache) return _cache;
	_cache = (async () => {
		const priceIds = Object.keys(MAP);
		if (priceIds.length === 0) return [];
		const prices = await stripe.prices.list({ limit: 100, expand: ['data.product'] });
		const wanted = new Map(priceIds.map((id) => [id, true]));
		const out: TopupOption[] = [];
		for (const p of prices.data) {
			if (!wanted.get(p.id)) continue;
			if (!p.unit_amount || !p.currency) continue;
			const credits = MAP[p.id];
			if (!credits) continue;
			const productName = (p.product as Stripe.Product | null)?.name ?? 'Credits';
			out.push({
				priceId: p.id,
				credits,
				label: `Buy ${credits} credits — ${productName}`,
				currency: p.currency,
				unitAmount: p.unit_amount
			});
		}
		// Keep only priceIds that were explicitly configured (preserve order from env)
		const order = new Map(priceIds.map((id, i) => [id, i]));
		out.sort((a, b) => (order.get(a.priceId) ?? 0) - (order.get(b.priceId) ?? 0));
		return out;
	})();
	return _cache;
}

