import { admin } from '@/server/supabaseAdmin';

export type BillingUserProfile = {
	id: string;
	email: string | null;
	billing_email: string | null;
	stripe_customer_id: string | null;
};

export async function getUserBillingProfile(
	userId: string,
	client = admin
): Promise<BillingUserProfile | null> {
	const { data, error } = await client
		.from('users')
		.select('id, email, billing_email, stripe_customer_id')
		.eq('id', userId)
		.single();

	if (error) {
		if (error.code === 'PGRST116') {
			return null;
		}
		throw new Error(`Failed to load user profile: ${error.message}`);
	}

	return data as BillingUserProfile;
}

export async function updateUserStripeCustomerId(
	userId: string,
	customerId: string,
	client = admin
): Promise<void> {
	const { error } = await client
		.from('users')
		.update({ stripe_customer_id: customerId })
		.eq('id', userId);

	if (error) {
		throw new Error(`Failed to persist stripe_customer_id: ${error.message}`);
	}
}


