import { NextRequest, NextResponse } from 'next/server';
import { adminHeaderName, validateAdminToken } from '@/server/utils/adminAuth';
import { getCreditPackageById, verifyStripePriceId } from '@/server/services/creditPackagesAdmin';

type RouteContext = {
	params: { id: string };
};

export async function POST(request: NextRequest, context: RouteContext) {
	const headerName = adminHeaderName();
	const providedToken = request.headers.get(headerName);

	if (!validateAdminToken(providedToken)) {
		return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
	}

	const { id } = context.params;

	try {
		const body = (await request.json().catch(() => ({}))) as { priceId?: string };
		let targetPriceId = body.priceId?.trim();

		if (!targetPriceId) {
			const pkg = await getCreditPackageById(id);
			targetPriceId = pkg.stripe_price_id ?? undefined;
		}

		if (!targetPriceId) {
			return NextResponse.json({ ok: false, error: 'missing_price_id' }, { status: 400 });
		}

		const verification = await verifyStripePriceId(targetPriceId);
		return NextResponse.json(verification);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error('[admin-credit-packages] Failed to verify price', { id, message });
		return NextResponse.json({ ok: false, error: 'verification_failed', message }, { status: 500 });
	}
}


