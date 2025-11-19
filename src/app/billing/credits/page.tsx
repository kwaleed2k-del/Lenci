import React from 'react';
import { BuyButton } from './BuyButton';

type PackagesResponse = {
	packages: {
		id: string;
		name: string;
		credits_amount: number;
		price_usd: number;
	}[];
};

type BillingCreditsPageProps = {
	searchParams?: {
		status?: string;
	};
};

async function fetchCreditPackages(): Promise<PackagesResponse['packages']> {
	const baseUrl = process.env.APP_BASE_URL;
	if (!baseUrl) {
		throw new Error('APP_BASE_URL is not configured');
	}
	const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/credit-packages`, {
		cache: 'no-store',
		next: { revalidate: 0 }
	});
	if (!response.ok) {
		throw new Error('Failed to load credit packages');
	}
	const json = (await response.json()) as PackagesResponse;
	return json.packages;
}

export default async function BillingCreditsPage({ searchParams }: BillingCreditsPageProps) {
	const packages = await fetchCreditPackages();
	const status = searchParams?.status;

	return (
		<div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
			<div>
				<h1 className="text-2xl font-semibold text-white">Buy Credits</h1>
				<p className="text-sm text-zinc-400">
					Choose a package below to top up your account. Credits will become available after
					payment succeeds.
				</p>
			</div>

			{status === 'success' && (
				<div className="rounded border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-200">
					Payment successful. Your credits will appear shortly.
				</div>
			)}

			{status === 'cancelled' && (
				<div className="rounded border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-200">
					Checkout canceled. You can try again at any time.
				</div>
			)}

			{packages.length === 0 ? (
				<div className="rounded border border-white/10 p-6 text-center text-sm text-zinc-400">
					No credit packages are currently available. Check back later.
				</div>
			) : (
				<div className="grid gap-4 md:grid-cols-2">
					{packages.map((pkg) => (
						<div key={pkg.id} className="rounded border border-white/10 bg-zinc-900/80 p-4">
							<h2 className="text-lg font-semibold text-white">{pkg.name}</h2>
							<p className="text-sm text-zinc-400">{pkg.credits_amount} credits</p>
							<p className="mt-2 text-xl font-bold text-white">
								${pkg.price_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
							</p>
							<div className="mt-4">
								<BuyButton packageId={pkg.id} />
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}


