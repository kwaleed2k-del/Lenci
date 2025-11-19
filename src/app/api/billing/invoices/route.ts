import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/src/server/auth';
import { listUserInvoices } from '@/src/server/services/billingInvoices';

export async function GET(request: NextRequest) {
	try {
		const user = await getSessionUser();
		const { searchParams } = new URL(request.url);
		const limitParam = searchParams.get('limit');
		const cursor = searchParams.get('starting_after') ?? searchParams.get('cursor') ?? undefined;
		const limit = limitParam ? Number(limitParam) : 20;

		const data = await listUserInvoices(user.id, {
			limit: Number.isFinite(limit) ? limit : 20,
			starting_after: cursor
		});

		return NextResponse.json(data);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (message.includes('UNAUTHENTICATED')) {
			return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
		}
		console.error('[billing-invoices] Failed to list invoices', { message });
		return NextResponse.json({ error: 'failed_to_list_invoices' }, { status: 500 });
	}
}


