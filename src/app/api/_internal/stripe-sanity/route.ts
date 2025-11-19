import { NextRequest, NextResponse } from 'next/server';
import { runStripeSanityChecks } from '@/server/services/stripeSanity';

const ADMIN_HEADER = 'x-admin-token';

export async function GET(request: NextRequest) {
	const adminToken = process.env.INTERNAL_ADMIN_TOKEN;
	const provided = request.headers.get(ADMIN_HEADER);

	if (!adminToken || !provided || provided !== adminToken) {
		return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
	}

	try {
		const { report } = await runStripeSanityChecks();
		return NextResponse.json(report);
	} catch (error) {
		console.error('[stripe-sanity] API route failed', error);
		return NextResponse.json({ error: 'internal_error' }, { status: 500 });
	}
}


