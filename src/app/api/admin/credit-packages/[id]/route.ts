import { NextRequest, NextResponse } from 'next/server';
import { adminHeaderName, validateAdminToken } from '@/server/utils/adminAuth';
import { updateCreditPackageById } from '@/server/services/creditPackagesAdmin';

type RouteContext = {
	params: { id: string };
};

export async function PATCH(request: NextRequest, context: RouteContext) {
	const headerName = adminHeaderName();
	const providedToken = request.headers.get(headerName);

	if (!validateAdminToken(providedToken)) {
		return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
	}

	const { id } = context.params;

	try {
		const body = (await request.json().catch(() => ({}))) as {
			stripe_price_id?: string | null;
			is_active?: boolean;
		};

		const result = await updateCreditPackageById(id, body);
		return NextResponse.json(result);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error('[admin-credit-packages] Failed to update package', { id, message });
		return NextResponse.json({ error: 'failed_to_update', message }, { status: 400 });
	}
}


