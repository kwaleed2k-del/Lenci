import { useCallback, useEffect, useState } from 'react';

export type MeProfile = {
	id: string;
	email: string | null;
	displayName: string | null;
	marketingOptIn: boolean;
	marketingOptInAt: string | null;
	marketingOptInSource: string | null;
};

type UpdatePayload = {
	marketingOptIn?: boolean;
};

export function useMe() {
	const [profile, setProfile] = useState<MeProfile | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await fetch('/api/me', { credentials: 'include' });
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}
			const data = (await response.json()) as MeProfile;
			setProfile(data);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			setError(message);
			setProfile(null);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const save = useCallback(
		async (payload: UpdatePayload) => {
			const body: Record<string, unknown> = {};
			if (typeof payload.marketingOptIn === 'boolean') {
				body.marketingOptIn = payload.marketingOptIn;
			}

			const response = await fetch('/api/me', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			if (!response.ok) {
				const text = await response.text();
				throw new Error(text || `HTTP ${response.status}`);
			}

			const updated = (await response.json()) as {
				ok: boolean;
				marketingOptIn: boolean;
				marketingOptInAt: string | null;
				marketingOptInSource: string | null;
			};

			setProfile((prev) =>
				prev
					? {
							...prev,
							marketingOptIn: updated.marketingOptIn,
							marketingOptInAt: updated.marketingOptInAt,
							marketingOptInSource: updated.marketingOptInSource
					  }
					: prev
			);

			return updated;
		},
		[]
	);

	return { profile, loading, error, refresh: load, save };
}


