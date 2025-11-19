import { NextRequest, NextResponse } from 'next/server';
import { adminHeaderName, validateAdminToken } from '@/server/utils/adminAuth';
import { listCreditPackages } from '@/server/services/creditPackagesAdmin';

export async function GET(request: NextRequest) {
	const headerName = adminHeaderName();
	const providedToken = request.headers.get(headerName);

	if (!validateAdminToken(providedToken)) {
		return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
	}

	try {
		const packages = await listCreditPackages();
		return NextResponse.json({ packages });
	} catch (error) {
		console.error('[admin-credit-packages] Failed to list packages', error);
		return NextResponse.json({ error: 'failed_to_list_packages' }, { status: 500 });
	}
}


