import { admin } from '@/server/supabaseAdmin';
import { stripe } from '@/lib/stripe';

export type CreditPackage = {
	id: string;
	name: string;
	credits_amount: number;
	bonus_credits?: number | null;
	price_usd: number;
	stripe_price_id: string | null;
	is_active: boolean;
};

export type CreditPackageUpdateInput = {
	stripe_price_id?: string | null;
	is_active?: boolean;
};

export type StripeVerificationResult = {
	ok: boolean;
	priceId: string;
	productName: string | null;
	currency: string | null;
	unitAmount: number | null;
	message?: string;
};

export async function listCreditPackages(client = admin): Promise<CreditPackage[]> {
	const { data, error } = await client
		.from('credit_packages')
		.select('id, name, credits_amount, price_usd, stripe_price_id, is_active')
		.order('name', { ascending: true });

	if (error) {
		throw new Error(`Failed to list credit packages: ${error.message}`);
	}

	return data ?? [];
}

export type PublicCreditPackage = Pick<CreditPackage, 'id' | 'name' | 'credits_amount' | 'price_usd'>;

export async function listPublicCreditPackages(client = admin): Promise<PublicCreditPackage[]> {
	const { data, error } = await client
		.from('credit_packages')
		.select('id, name, credits_amount, price_usd')
		.eq('is_active', true)
		.order('credits_amount', { ascending: true });

	if (error) {
		throw new Error(`Failed to list public credit packages: ${error.message}`);
	}

	return data ?? [];
}

export async function getCreditPackageById(id: string, client = admin): Promise<CreditPackage> {
	const { data, error } = await client
		.from('credit_packages')
		.select('id, name, credits_amount, bonus_credits, price_usd, stripe_price_id, is_active')
		.eq('id', id)
		.single();

	if (error) {
		throw new Error(`Failed to load credit package: ${error.message}`);
	}

	return data;
}
export async function getCreditPackagesByPriceIds(priceIds: string[], client = admin): Promise<CreditPackage[]> {
	if (priceIds.length === 0) return [];
	const { data, error } = await client
		.from('credit_packages')
		.select('id, name, credits_amount, bonus_credits, price_usd, stripe_price_id, is_active')
		.in('stripe_price_id', priceIds)
		.eq('is_active', true);

	if (error) {
		throw new Error(`Failed to fetch credit packages by price id: ${error.message}`);
	}

	return data ?? [];
}

export async function updateCreditPackageById(
	id: string,
	input: CreditPackageUpdateInput,
	client = admin
): Promise<CreditPackage> {
	const payload: Record<string, unknown> = {};
	if (Object.prototype.hasOwnProperty.call(input, 'stripe_price_id')) {
		payload.stripe_price_id = input.stripe_price_id ?? null;
	}
	if (Object.prototype.hasOwnProperty.call(input, 'is_active')) {
		payload.is_active = Boolean(input.is_active);
	}

	if (Object.keys(payload).length === 0) {
		throw new Error('No valid fields provided for update');
	}

	const { data, error } = await client
		.from('credit_packages')
		.update(payload)
		.eq('id', id)
		.select('id, name, credits_amount, price_usd, stripe_price_id, is_active')
		.single();

	if (error) {
		throw new Error(`Failed to update credit package: ${error.message}`);
	}

	return data;
}

export async function verifyStripePriceId(
	priceId: string,
	stripeClient = stripe
): Promise<StripeVerificationResult> {
	try {
		const price = await stripeClient.prices.retrieve(priceId, {
			expand: ['product']
		});
		const productName =
			typeof price.product === 'string' ? price.product : price.product?.name ?? null;
		return {
			ok: true,
			priceId,
			productName,
			currency: price.currency ?? null,
			unitAmount: typeof price.unit_amount === 'number' ? price.unit_amount : null
		};
	} catch (error) {
		return {
			ok: false,
			priceId,
			productName: null,
			currency: null,
			unitAmount: null,
			message: error instanceof Error ? error.message : String(error)
		};
	}
}


