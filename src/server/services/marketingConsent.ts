import { admin } from '../supabaseAdmin';

export type MarketingConsent = {
	marketingOptIn: boolean;
	marketingOptInAt: string | null;
	marketingOptInSource: string | null;
};

type ConsentRow = {
	marketing_opt_in: boolean | null;
	marketing_opt_in_at: string | null;
	marketing_opt_source: string | null;
};

function normalize(row: ConsentRow): MarketingConsent {
	return {
		marketingOptIn: Boolean(row.marketing_opt_in),
		marketingOptInAt: row.marketing_opt_in_at,
		marketingOptInSource: row.marketing_opt_source
	};
}

async function fetchConsentRow(userId: string): Promise<ConsentRow> {
	const { data, error } = await admin
		.from('users')
		.select('marketing_opt_in, marketing_opt_in_at, marketing_opt_source')
		.eq('id', userId)
		.single();

	if (error || !data) {
		throw new Error(error?.message ?? 'user_not_found');
	}

	return data as ConsentRow;
}

export async function getConsent(userId: string): Promise<MarketingConsent> {
	const row = await fetchConsentRow(userId);
	return normalize(row);
}

export async function setConsent(
	userId: string,
	next: { marketingOptIn: boolean; source?: string; ip?: string | null }
): Promise<MarketingConsent> {
	const currentRow = await fetchConsentRow(userId);
	const currentOptIn = Boolean(currentRow.marketing_opt_in);
	const updates: Record<string, unknown> = {};

	if (next.marketingOptIn && !currentOptIn) {
		updates.marketing_opt_in = true;
		updates.marketing_opt_in_at = new Date().toISOString();
		if (typeof next.ip === 'string') {
			updates.marketing_opt_in_ip = next.ip;
		}
		updates.marketing_opt_source =
			next.source ??
			currentRow.marketing_opt_source ??
			'profile';
	} else if (!next.marketingOptIn && currentOptIn) {
		updates.marketing_opt_in = false;
		// Preserve audit fields
	} else {
		// No-op
		return normalize(currentRow);
	}

	const { data, error } = await admin
		.from('users')
		.update(updates)
		.eq('id', userId)
		.select('marketing_opt_in, marketing_opt_in_at, marketing_opt_source')
		.single();

	if (error || !data) {
		throw new Error(error?.message ?? 'update_failed');
	}

	return normalize(data as ConsentRow);
}


