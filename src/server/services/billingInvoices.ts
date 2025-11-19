import { stripe } from '@/lib/stripe';
import { admin } from '@/server/supabaseAdmin';
import type Stripe from 'stripe';

type InvoiceListResponse = {
	items: InvoiceSummary[];
	has_more: boolean;
	next_cursor: string | null;
};

export type InvoiceSummary = {
	id: string;
	number: string | null;
	status: Stripe.Invoice.Status | null;
	currency: string | null;
	total: number | null;
	subtotal: number | null;
	created: number;
	invoice_pdf: string | null;
	hosted_invoice_url: string | null;
	subscription_id: string | null;
	customer_email: string | null;
};

async function getUserStripeCustomer(userId: string): Promise<{ customerId: string | null; email: string | null }> {
	const { data, error } = await admin
		.from('users')
		.select('id, email, stripe_customer_id')
		.eq('id', userId)
		.single();

	if (error) {
		throw new Error(`Failed to load user profile: ${error.message}`);
	}

	return {
		customerId: (data?.stripe_customer_id as string) ?? null,
		email: (data?.email as string) ?? null
	};
}

function mapInvoice(invoice: Stripe.Invoice): InvoiceSummary {
	return {
		id: invoice.id,
		number: invoice.number ?? null,
		status: invoice.status ?? null,
		currency: invoice.currency ?? null,
		total: invoice.total ?? null,
		subtotal: invoice.subtotal ?? null,
		created: invoice.created,
		invoice_pdf: invoice.invoice_pdf ?? null,
		hosted_invoice_url: invoice.hosted_invoice_url ?? null,
		subscription_id: typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id ?? null,
		customer_email: invoice.customer_email ?? null
	};
}

export async function listUserInvoices(
	userId: string,
	params: { limit?: number; starting_after?: string }
): Promise<InvoiceListResponse> {
	const { customerId } = await getUserStripeCustomer(userId);
	if (!customerId) {
		return {
			items: [],
			has_more: false,
			next_cursor: null
		};
	}

	const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
	const stripeParams: Stripe.InvoiceListParams = {
		customer: customerId,
		limit
	};

	if (params.starting_after) {
		stripeParams.starting_after = params.starting_after;
	}

	const response = await stripe.invoices.list(stripeParams);
	const items = response.data.map(mapInvoice);
	const nextCursor = response.has_more ? response.data[response.data.length - 1]?.id ?? null : null;

	return {
		items,
		has_more: response.has_more,
		next_cursor: nextCursor
	};
}

type InvoiceLookup =
	| { invoice: InvoiceSummary; reason: 'ok' }
	| { invoice: null; reason: 'missing_customer' | 'not_found' | 'forbidden' };

export async function getUserInvoice(userId: string, invoiceId: string): Promise<InvoiceLookup> {
	const { customerId } = await getUserStripeCustomer(userId);
	if (!customerId) {
		return { invoice: null, reason: 'missing_customer' };
	}

	let invoice: Stripe.Invoice;
	try {
		invoice = await stripe.invoices.retrieve(invoiceId);
	} catch (error) {
		const statusCode = (error as { statusCode?: number })?.statusCode;
		if (statusCode === 404) {
			return { invoice: null, reason: 'not_found' };
		}
		throw error;
	}

	const invoiceCustomerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null;
	if (!invoiceCustomerId || invoiceCustomerId !== customerId) {
		return { invoice: null, reason: 'forbidden' };
	}

	return { invoice: mapInvoice(invoice), reason: 'ok' };
}


