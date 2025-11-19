'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type CreditPackage = {
	id: string;
	name: string;
	credits_amount: number;
	price_usd: number;
	stripe_price_id: string | null;
	is_active: boolean;
};

type VerificationStatus = {
	ok: boolean;
	priceId: string;
	productName: string | null;
	currency: string | null;
	unitAmount: number | null;
	message?: string;
};

const ADMIN_HEADER = 'X-Admin-Token';

export default function CreditPackagesAdminPage() {
	const [token, setToken] = useState('');
	const [packages, setPackages] = useState<CreditPackage[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [verifications, setVerifications] = useState<Record<string, VerificationStatus>>({});
	const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});

	const canFetch = token.trim().length > 0;

	const fetchPackages = useCallback(async () => {
		if (!canFetch) return;
		setLoading(true);
		setError(null);
		try {
			const response = await fetch('/api/admin/credit-packages', {
				headers: {
					[ADMIN_HEADER]: token
				}
			});
			if (!response.ok) {
				throw new Error(`Failed to load packages: ${response.status}`);
			}
			const json = (await response.json()) as { packages: CreditPackage[] };
			setPackages(json.packages);
			const nextInputs: Record<string, string> = {};
			for (const pkg of json.packages) {
				nextInputs[pkg.id] = pkg.stripe_price_id ?? '';
			}
			setPriceInputs(nextInputs);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, [canFetch, token]);

	useEffect(() => {
		setPackages([]);
		setVerifications({});
	}, [token]);

	const savePackage = useCallback(
		async (pkg: CreditPackage) => {
			const payload: Record<string, unknown> = {};
			if (priceInputs[pkg.id] !== undefined && priceInputs[pkg.id] !== pkg.stripe_price_id) {
				payload.stripe_price_id = priceInputs[pkg.id] || null;
			}
			if (Object.keys(payload).length === 0) return;

			const response = await fetch(`/api/admin/credit-packages/${pkg.id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					[ADMIN_HEADER]: token
				},
				body: JSON.stringify(payload)
			});
			if (!response.ok) {
				throw new Error('Failed to update package');
			}
			const updated = (await response.json()) as CreditPackage;
			setPackages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
		},
		[priceInputs, token]
	);

	const toggleActive = useCallback(
		async (pkg: CreditPackage, value: boolean) => {
			const response = await fetch(`/api/admin/credit-packages/${pkg.id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					[ADMIN_HEADER]: token
				},
				body: JSON.stringify({ is_active: value })
			});
			if (!response.ok) {
				throw new Error('Failed to update package status');
			}
			const updated = (await response.json()) as CreditPackage;
			setPackages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
		},
		[token]
	);

	const verifyPackage = useCallback(
		async (pkg: CreditPackage) => {
			const body =
				priceInputs[pkg.id] && priceInputs[pkg.id] !== pkg.stripe_price_id
					? { priceId: priceInputs[pkg.id] }
					: undefined;

			const response = await fetch(`/api/admin/credit-packages/${pkg.id}/verify`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					[ADMIN_HEADER]: token
				},
				body: body ? JSON.stringify(body) : undefined
			});

			if (!response.ok) {
				throw new Error('Verification failed');
			}

			const json = (await response.json()) as VerificationStatus;
			setVerifications((prev) => ({ ...prev, [pkg.id]: json }));
		},
		[priceInputs, token]
	);

	const statusLabel = useCallback(
		(pkg: CreditPackage): { text: string; color: string } => {
			const verification = verifications[pkg.id];
			if (verification) {
				return verification.ok
					? { text: 'OK', color: 'text-green-600' }
					: { text: 'Invalid', color: 'text-red-600' };
			}
			return pkg.stripe_price_id
				? { text: 'Pending', color: 'text-yellow-600' }
				: { text: 'Empty', color: 'text-gray-500' };
		},
		[verifications]
	);

	const renderPackages = useMemo(() => {
		if (!canFetch) {
			return <p className="text-sm text-gray-500">Enter the admin token to load packages.</p>;
		}
		if (loading) {
			return <p>Loading packages…</p>;
		}
		if (error) {
			return (
				<p className="text-sm text-red-600">
					Failed to load packages: {error}. Verify the token and try again.
				</p>
			);
		}
		if (packages.length === 0) {
			return <p className="text-sm text-gray-500">No packages found.</p>;
		}
		return (
			<table className="min-w-full border border-gray-200 text-sm">
				<thead className="bg-gray-50">
					<tr>
						<th className="p-2 text-left">Name</th>
						<th className="p-2 text-left">Credits</th>
						<th className="p-2 text-left">Price USD</th>
						<th className="p-2 text-left">Stripe Price ID</th>
						<th className="p-2 text-left">Status</th>
						<th className="p-2 text-left">Active</th>
						<th className="p-2 text-left">Actions</th>
					</tr>
				</thead>
				<tbody>
					{packages.map((pkg) => {
						const status = statusLabel(pkg);
						return (
							<tr key={pkg.id} className="border-t">
								<td className="p-2">{pkg.name}</td>
								<td className="p-2">{pkg.credits_amount}</td>
								<td className="p-2">{pkg.price_usd}</td>
								<td className="p-2">
									<input
										className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
										value={priceInputs[pkg.id] ?? ''}
										onChange={(event) =>
											setPriceInputs((prev) => ({
												...prev,
												[pkg.id]: event.target.value
											}))
										}
									/>
								</td>
								<td className={`p-2 font-medium ${status.color}`}>{status.text}</td>
								<td className="p-2">
									<input
										type="checkbox"
										checked={pkg.is_active}
										onChange={(event) => {
											void toggleActive(pkg, event.target.checked).catch((err) =>
												setError(err.message)
											);
										}}
									/>
								</td>
								<td className="p-2 space-x-2">
									<button
										className="rounded bg-blue-600 px-2 py-1 text-white"
										onClick={() =>
											savePackage(pkg).catch((err) => setError(err.message))
										}
									>
										Save
									</button>
									<button
										className="rounded border border-blue-600 px-2 py-1 text-blue-600"
										onClick={() =>
											verifyPackage(pkg).catch((err) => setError(err.message))
										}
									>
										Verify
									</button>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		);
	}, [canFetch, error, loading, packages, priceInputs, savePackage, statusLabel, toggleActive, verifyPackage]);

	return (
		<div className="mx-auto max-w-5xl space-y-4 p-6">
			<h1 className="text-2xl font-semibold">Credit Packages Admin</h1>
			<div className="space-y-2 rounded border border-gray-200 p-4">
				<label className="flex flex-col gap-1 text-sm font-medium">
					Admin Token
					<input
						type="password"
						className="rounded border border-gray-300 px-3 py-2"
						value={token}
						onChange={(event) => setToken(event.target.value)}
						placeholder="Enter INTERNAL_ADMIN_TOKEN"
					/>
				</label>
				<button
					className="rounded bg-gray-900 px-3 py-2 text-white disabled:opacity-50"
					onClick={() => fetchPackages()}
					disabled={!canFetch || loading}
				>
					Load packages
				</button>
				{error && <p className="text-sm text-red-600">{error}</p>}
			</div>

			{renderPackages}
		</div>
	);
}


