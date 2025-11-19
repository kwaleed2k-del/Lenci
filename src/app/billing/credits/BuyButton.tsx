'use client';

import { useState } from 'react';

type BuyButtonProps = {
	packageId: string;
};

export function BuyButton({ packageId }: BuyButtonProps) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handlePurchase = async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetch('/api/checkout/credits', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ packageId })
			});

			if (!response.ok) {
				const payload = (await response.json().catch(() => ({}))) as { error?: string };
				throw new Error(payload.error ?? 'Checkout failed');
			}

			const json = (await response.json()) as { url: string };
			window.location.href = json.url;
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="space-y-1">
			<button
				onClick={() => void handlePurchase()}
				disabled={loading}
				className="w-full rounded bg-violet-600 px-4 py-2 text-white text-sm font-semibold transition hover:bg-violet-500 disabled:opacity-50"
			>
				{loading ? 'Redirecting…' : 'Buy'}
			</button>
			{error && <p className="text-xs text-red-500">{error}</p>}
		</div>
	);
}


