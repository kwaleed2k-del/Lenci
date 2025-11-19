import type Stripe from 'stripe';
import { admin } from '../supabaseAdmin';
import { stripe as defaultStripe, detectStripeMode, readStripeKeyPresence, type StripeMode } from '@/lib/stripe';

type SanityLogger = {
	info: (message: string, meta?: Record<string, unknown>) => void;
	warn: (message: string, meta?: Record<string, unknown>) => void;
	error: (message: string, meta?: Record<string, unknown>) => void;
};

type CreditPackageRow = {
	id: string;
	name: string;
	stripe_price_id: string | null;
	is_active: boolean | null;
};

export type PackageVerification = {
	id: string;
	name: string;
	priceId: string | null;
	verified: 'OK' | 'Invalid' | 'Empty';
	productName: string | null;
	currency: string | null;
	unitAmount: number | null;
};

export type StripeSanityReport = {
	mode: StripeMode;
	keysPresent: {
		secret: boolean;
		publishable: boolean;
		webhookSecret: boolean;
		adminToken: boolean;
	};
	webhookUrl: string | null;
	db: {
		billingEventsStripeEventIdUnique: boolean;
	};
	packages: PackageVerification[];
};

export type SanityIssue = {
	code: string;
	message: string;
	severity: 'error' | 'warn';
};

export type StripeSanityResult = {
	report: StripeSanityReport;
	issues: SanityIssue[];
	hasBlockingIssues: boolean;
};

export type StripeSanityOptions = {
	env?: NodeJS.ProcessEnv;
	logger?: SanityLogger;
	stripeClient?: Pick<Stripe, 'prices'>;
	fetchActivePackages?: () => Promise<CreditPackageRow[]>;
	checkBillingEventsUnique?: () => Promise<boolean>;
};

const defaultLogger: SanityLogger = {
	info: (message, meta) => logMessage('info', message, meta),
	warn: (message, meta) => logMessage('warn', message, meta),
	error: (message, meta) => logMessage('error', message, meta)
};

export async function runStripeSanityChecks(options?: StripeSanityOptions): Promise<StripeSanityResult> {
	const env = options?.env ?? process.env;
	const logger = options?.logger ?? defaultLogger;
	const stripeClient = options?.stripeClient ?? defaultStripe;
	const fetchPackages = options?.fetchActivePackages ?? fetchActiveCreditPackages;
	const checkConstraint = options?.checkBillingEventsUnique ?? ensureBillingEventsUniqueIndex;

	const keysPresent = readStripeKeyPresence(env);
	const mode = detectStripeMode(env.STRIPE_SECRET_KEY, env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
	const webhookUrl = env.STRIPE_WEBHOOK_URL ?? null;

	const issues: SanityIssue[] = [];

	let billingEventsUnique = false;
	try {
		billingEventsUnique = await checkConstraint();
		logger.info('billing_events.stripe_event_id uniqueness verified', {
			billingEventsUnique
		});
	} catch (error) {
		const message = asErrorMessage(error);
		logger.error('Failed to verify billing_events uniqueness', { message });
		billingEventsUnique = false;
	}

	let packages: PackageVerification[] = [];
	try {
		const rows = await fetchPackages();
		logger.info('Fetched credit packages', { count: rows.length });
		packages = await verifyPackages(rows, stripeClient, logger);
	} catch (error) {
		const message = asErrorMessage(error);
		logger.error('Failed to verify credit packages', { message });
		packages = [];
		issues.push({
			code: 'packages.fetch_failed',
			message: 'Unable to fetch active credit packages',
			severity: 'error'
		});
	}

	const report: StripeSanityReport = {
		mode,
		keysPresent,
		webhookUrl,
		db: {
			billingEventsStripeEventIdUnique: billingEventsUnique
		},
		packages
	};

	const blockingIssues: SanityIssue[] = [];

	for (const [key, present] of Object.entries(keysPresent) as [keyof StripeSanityReport['keysPresent'], boolean][]) {
		if (!present) {
			const issue: SanityIssue = {
				code: `env.${key}`,
				message: `Missing environment variable for ${key}`,
				severity: 'error'
			};
			blockingIssues.push(issue);
			issues.push(issue);
		}
	}

	if (!billingEventsUnique) {
		const issue = {
			code: 'db.billing_events_unique',
			message: 'billing_events.stripe_event_id is not unique or verification failed',
			severity: 'error' as const
		};
		blockingIssues.push(issue);
		issues.push(issue);
	}

	const invalidPackages = packages.filter((pkg) => pkg.verified !== 'OK');
	for (const pkg of invalidPackages) {
		const issue = {
			code: `package.${pkg.id}`,
			message: `Package ${pkg.id} verification status ${pkg.verified}`,
			severity: 'error' as const
		};
		blockingIssues.push(issue);
		issues.push(issue);
	}

	const hasBlockingIssues = blockingIssues.length > 0;

	return {
		report,
		issues,
		hasBlockingIssues
	};
}

async function fetchActiveCreditPackages(): Promise<CreditPackageRow[]> {
	const { data, error } = await admin
		.from('credit_packages')
		.select('id, name, stripe_price_id, is_active')
		.eq('is_active', true);

	if (error) {
		throw new Error(`Failed to fetch credit packages: ${error.message}`);
	}

	return data ?? [];
}

async function ensureBillingEventsUniqueIndex(): Promise<boolean> {
	const { data, error } = await admin
		.from('pg_indexes')
		.select('indexname,indexdef')
		.eq('schemaname', 'public')
		.eq('tablename', 'billing_events');

	if (error) {
		throw new Error(`Failed to inspect pg_indexes: ${error.message}`);
	}

	return (data ?? []).some((row) => {
		const definition = row.indexdef ?? '';
		return definition.includes('UNIQUE') && definition.includes('(stripe_event_id)');
	});
}

async function verifyPackages(
	rows: CreditPackageRow[],
	stripeClient: Pick<Stripe, 'prices'>,
	logger: SanityLogger
): Promise<PackageVerification[]> {
	return Promise.all(
		rows.map(async (row) => {
			const base: PackageVerification = {
				id: row.id,
				name: row.name,
				priceId: row.stripe_price_id ?? null,
				verified: 'Empty',
				productName: null,
				currency: null,
				unitAmount: null
			};

			if (!row.stripe_price_id || row.stripe_price_id.trim().length === 0) {
				logger.warn('Credit package missing stripe_price_id', { packageId: row.id });
				return base;
			}

			try {
				const price = await stripeClient.prices.retrieve(row.stripe_price_id, {
					expand: ['product']
				});
				const productName =
					typeof price.product === 'string' ? price.product : price.product?.name ?? null;

				return {
					...base,
					verified: 'OK',
					productName,
					currency: price.currency ?? null,
					unitAmount: typeof price.unit_amount === 'number' ? price.unit_amount : null
				};
			} catch (error) {
				const message = asErrorMessage(error);
				logger.warn('Stripe price validation failed', {
					packageId: row.id,
					priceId: row.stripe_price_id,
					message
				});
				return {
					...base,
					verified: 'Invalid'
				};
			}
		})
	);
}

function logMessage(level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>) {
	const payload = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
	const line = `[stripe-sanity] ${message}${payload}`;
	if (level === 'error') {
		console.error(line);
	} else if (level === 'warn') {
		console.warn(line);
	} else {
		console.info(line);
	}
}

function asErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
}


