import { NextResponse } from 'next/server';
import { listPublicCreditPackages } from '@/server/services/creditPackagesAdmin';

export async function GET() {
	try {
		const packages = await listPublicCreditPackages();
		return NextResponse.json({ packages });
	} catch (error) {
		console.error('[credit-packages] Failed to list packages', error);
		return NextResponse.json({ error: 'failed_to_list_packages' }, { status: 500 });
	}
}


