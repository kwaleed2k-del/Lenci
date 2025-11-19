import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/server/auth';
import { getUserInvoice } from '@/src/server/services/billingInvoices';

type RouteContext = {
	params: { id: string };
};

export async function GET(_request: Request, context: RouteContext) {
	try {
		const user = await getSessionUser();
		const result = await getUserInvoice(user.id, context.params.id);
		if (!result.invoice) {
			const status = result.reason === 'not_found' ? 404 : 403;
			return NextResponse.json({ error: result.reason }, { status });
		}
		return NextResponse.json({
			id: result.invoice.id,
			number: result.invoice.number,
			status: result.invoice.status,
			invoice_pdf: result.invoice.invoice_pdf,
			hosted_invoice_url: result.invoice.hosted_invoice_url
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (message.includes('UNAUTHENTICATED')) {
			return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
		}
		console.error('[billing-invoice] Failed to load invoice', { message });
		return NextResponse.json({ error: 'failed_to_load_invoice' }, { status: 500 });
	}
}


