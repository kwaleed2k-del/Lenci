import { useCallback, useEffect, useState } from 'react';

export type Purchase = {
	at: string;
	kind: 'topup' | 'topup_auto';
	credits: number | null;
	amountCents: number | null;
	currency: string | null;
	receiptUrl: string | null;
};

export function usePurchases(days = 90, limit = 50) {
	const [purchases, setPurchases] = useState<Purchase[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [from, setFrom] = useState<string | null>(null);
	const [to, setTo] = useState<string | null>(null);

	const fetcher = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const params = new URLSearchParams({
				days: String(days),
				limit: String(limit)
			});
			const r = await fetch(`/api/billing/purchases?${params}`, { credentials: 'include' });
			if (r.status === 401) {
				setError('Please sign in');
				setLoading(false);
				return;
			}
			if (!r.ok) throw new Error(`HTTP ${r.status}`);
			const j = await r.json();
			setPurchases(Array.isArray(j.purchases) ? j.purchases : []);
			setFrom(j.from ?? null);
			setTo(j.to ?? null);
		} catch (e: unknown) {
			const err = e as { message?: string };
			setError(String(err?.message ?? e));
		} finally {
			setLoading(false);
		}
	}, [days, limit]);

	useEffect(() => {
		void fetcher();
	}, [fetcher]);

	return { purchases, loading, error, from, to, refresh: fetcher };
}

