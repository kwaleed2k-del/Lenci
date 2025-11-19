import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
	throw new Error('Missing required environment variable STRIPE_SECRET_KEY');
}

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
	apiVersion: '2023-10-16'
});

export type StripeMode = 'test' | 'live' | 'unknown';

export function detectStripeMode(secretKey?: string | null, publishableKey?: string | null): StripeMode {
	const key = secretKey ?? publishableKey ?? '';
	if (!key) return 'unknown';
	if (key.startsWith('sk_test') || key.startsWith('pk_test')) return 'test';
	if (key.startsWith('sk_live') || key.startsWith('pk_live')) return 'live';
	return 'unknown';
}

export function readStripeKeyPresence(env: NodeJS.ProcessEnv) {
	return {
		secret: Boolean(env.STRIPE_SECRET_KEY),
		publishable: Boolean(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
		webhookSecret: Boolean(env.STRIPE_WEBHOOK_SECRET),
		adminToken: Boolean(env.INTERNAL_ADMIN_TOKEN)
	};
}


