import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { processStripeEvent } from '@/server/services/stripeWebhook';

function getWebhookSecret(): string {
	const secret = process.env.STRIPE_WEBHOOK_SECRET;
	if (!secret) {
		throw new Error('Missing STRIPE_WEBHOOK_SECRET');
	}
	return secret;
}

export async function POST(request: Request) {
	const signature = request.headers.get('stripe-signature');
	if (!signature) {
		return NextResponse.json({ error: 'missing_signature' }, { status: 400 });
	}

	const rawBody = await request.text();

	let event;
	try {
		event = stripe.webhooks.constructEvent(rawBody, signature, getWebhookSecret());
	} catch (error) {
		console.error('[stripe-webhook] Invalid signature', {
			message: error instanceof Error ? error.message : String(error)
		});
		return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
	}

	try {
		await processStripeEvent(event);
	} catch (error) {
		console.error('[stripe-webhook] Processing failed', {
			eventId: event.id,
			type: event.type,
			message: error instanceof Error ? error.message : String(error)
		});
		// Return 200 to avoid retries for internal errors; admins can resend events.
		return NextResponse.json({ ok: false });
	}

	return NextResponse.json({ ok: true });
}


