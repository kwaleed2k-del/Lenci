import { useCallback, useEffect, useState } from 'react';

export type TopupOption = {
	priceId: string;
	credits: number;
	label: string;
	currency: string;
	unitAmount: number;
};

export function useTopupOptions() {
	const [options, setOptions] = useState<TopupOption[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetcher = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const r = await fetch('/api/billing/topup/options', { credentials: 'include' });
			if (r.status === 401) {
				setError('Please sign in');
				setLoading(false);
				return;
			}
			if (!r.ok) throw new Error(`HTTP ${r.status}`);
			const j = await r.json();
			setOptions(Array.isArray(j.options) ? j.options : []);
		} catch (e: unknown) {
			const err = e as { message?: string };
			setError(String(err?.message ?? e));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void fetcher();
	}, [fetcher]);

	return { options, loading, error, refresh: fetcher };
}

