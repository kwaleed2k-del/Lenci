import { useCallback, useEffect, useState } from 'react';

export type Settings = {
	enabled: boolean;
	priceId: string | null;
	threshold: number;
	lowCreditEmailsEnabled: boolean;
};

export function useAutoTopup() {
	const [settings, setSettings] = useState<Settings | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetcher = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const r = await fetch('/api/billing/auto-topup', { credentials: 'include' });
			if (r.status === 401) {
				setError('Please sign in');
				setLoading(false);
				return;
			}
			if (!r.ok) throw new Error(`HTTP ${r.status}`);
			const j = await r.json();
			setSettings(j.settings);
		} catch (e: unknown) {
			const err = e as { message?: string };
			setError(String(err?.message ?? e));
		} finally {
			setLoading(false);
		}
	}, []);

	const save = useCallback(async (patch: Partial<Settings>) => {
		const r = await fetch('/api/billing/auto-topup', {
			method: 'POST',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(patch)
		});
		if (!r.ok) throw new Error('save_failed');
		const j = await r.json();
		setSettings(j.settings);
		return j.settings as Settings;
	}, []);

	useEffect(() => {
		void fetcher();
	}, [fetcher]);

	return { settings, loading, error, refresh: fetcher, save };
}

