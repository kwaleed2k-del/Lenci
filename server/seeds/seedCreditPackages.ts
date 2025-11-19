import 'dotenv/config';
import { admin } from '@/server/supabaseAdmin';

export const DEFAULT_CREDIT_PACKAGES = [
	{
		name: 'Starter Credits 100',
		credits_amount: 100,
		price_usd: 0
	},
	{
		name: 'Pro Credits 500',
		credits_amount: 500,
		price_usd: 0
	},
	{
		name: 'Scale Credits 1000',
		credits_amount: 1000,
		price_usd: 0
	}
];

type SupabaseLike = {
	from: (table: string) => {
		upsert: (
			values: Record<string, unknown>,
			opts?: { onConflict?: string; ignoreDuplicates?: boolean }
		) => Promise<{ error: { message: string } | null }>;
	};
};

export async function upsertDefaultCreditPackages(client: SupabaseLike = admin) {
	for (const pkg of DEFAULT_CREDIT_PACKAGES) {
		const { error } = await client.from('credit_packages').upsert(
			{
				name: pkg.name,
				credits_amount: pkg.credits_amount,
				price_usd: pkg.price_usd,
				is_active: false
			},
			{
				onConflict: 'name',
				ignoreDuplicates: true
			}
		);
		if (error) {
			throw new Error(`Failed to upsert ${pkg.name}: ${error.message}`);
		}
		console.log(`✅ Ensured credit package: ${pkg.name}`);
	}
}

async function main() {
	await upsertDefaultCreditPackages();
	console.log('Credit packages seed complete.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((error) => {
		console.error('Credit packages seed failed:', error);
		process.exit(1);
	});
}


