import { NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { stripe } from '@/lib/stripe';
import { getCreditPackageById } from '@/server/services/creditPackagesAdmin';
import { getUserBillingProfile, updateUserStripeCustomerId } from '@/server/services/userProfile';

type CheckoutRequest = {
	packageId?: string;
};

function getAppBaseUrl(): string {
	const baseUrl = process.env.APP_BASE_URL;
	if (!baseUrl) {
		throw new Error('APP_BASE_URL is not configured');
	}
	return baseUrl.replace(/\/$/, '');
}

export async function POST(request: Request) {
	let user: { id: string; email?: string | null };
	try {
		user = await getSessionUser();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (message.includes('UNAUTHENTICATED')) {
			return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
		}
		console.error('[checkout-credits] Failed to resolve session user', { message });
		return NextResponse.json({ error: 'auth_error' }, { status: 401 });
	}

	let body: CheckoutRequest;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
	}

	if (!body.packageId || typeof body.packageId !== 'string') {
		return NextResponse.json({ error: 'packageId_required' }, { status: 400 });
	}

	let creditPackage;
	try {
		creditPackage = await getCreditPackageById(body.packageId);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.warn('[checkout-credits] Package lookup failed', {
			packageId: body.packageId,
			message
		});
		return NextResponse.json({ error: 'package_not_found' }, { status: 404 });
	}

	if (!creditPackage.is_active) {
		return NextResponse.json({ error: 'package_inactive' }, { status: 400 });
	}

	if (!creditPackage.stripe_price_id) {
		return NextResponse.json({ error: 'package_missing_price' }, { status: 400 });
	}

	const baseUrl = (() => {
		try {
			return getAppBaseUrl();
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error('[checkout-credits] Missing APP_BASE_URL', { message });
			return null;
		}
	})();

	if (!baseUrl) {
		return NextResponse.json({ error: 'configuration_error' }, { status: 500 });
	}

	const userProfile = await getUserBillingProfile(user.id);

	if (!userProfile) {
		return NextResponse.json({ error: 'user_profile_missing' }, { status: 400 });
	}

	let stripeCustomerId = userProfile.stripe_customer_id;

	if (!stripeCustomerId) {
		const email = userProfile.billing_email ?? userProfile.email ?? user.email ?? undefined;
		if (!email) {
			return NextResponse.json({ error: 'missing_billing_email' }, { status: 400 });
		}
		try {
			const customer = await stripe.customers.create({
				email,
				description: `Credit package customer for ${user.id}`
			});
			stripeCustomerId = customer.id;
			await updateUserStripeCustomerId(user.id, stripeCustomerId);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error('[checkout-credits] Failed to create Stripe customer', { message });
			return NextResponse.json({ error: 'customer_creation_failed' }, { status: 500 });
		}
	}

	try {
		const session = await stripe.checkout.sessions.create({
			mode: 'payment',
			customer: stripeCustomerId,
			line_items: [{ price: creditPackage.stripe_price_id, quantity: 1 }],
			client_reference_id: user.id,
			metadata: {
				userId: user.id,
				packageId: creditPackage.id,
				type: 'credit_package'
			},
			success_url: `${baseUrl}/billing/credits?status=success&session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${baseUrl}/billing/credits?status=cancelled`
		});

		if (!session.url) {
			throw new Error('Stripe session missing URL');
		}

		console.info('[checkout-credits] Checkout session created', {
			packageId: creditPackage.id,
			userId: user.id
		});

		return NextResponse.json({ url: session.url });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error('[checkout-credits] Failed to create checkout session', {
			userId: user.id,
			packageId: creditPackage.id,
			message
		});
		return NextResponse.json({ error: 'checkout_session_failed' }, { status: 500 });
	}
}


