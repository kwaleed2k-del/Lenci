import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import { runStripeSanityChecks, type StripeSanityOptions, type StripeSanityResult } from '@/server/services/stripeSanity';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

type CliOptions = {
	runner?: (options?: StripeSanityOptions) => Promise<StripeSanityResult>;
	runnerOptions?: StripeSanityOptions;
};

export async function stripeSanityCliMain(options?: CliOptions): Promise<number> {
	const runner = options?.runner ?? runStripeSanityChecks;
	const { report, hasBlockingIssues, issues } = await runner(options?.runnerOptions);

	printSummary(report);

	if (issues.length > 0) {
		console.log('\nIssues:');
		for (const issue of issues) {
			console.log(` - ${issue.code}: ${issue.message}`);
		}
	}

	if (hasBlockingIssues) {
		console.error(`\n${RED}Stripe sanity check failed.${RESET}`);
		return 1;
	}

	console.log(`\n${GREEN}Stripe sanity check passed.${RESET}`);
	return 0;
}

function printSummary(report: StripeSanityResult['report']) {
	console.log('Stripe Sanity Summary');
	console.log('---------------------');
	console.log(`Mode: ${report.mode}`);
	console.log(
		`Keys: secret=${flag(report.keysPresent.secret)} publishable=${flag(report.keysPresent.publishable)} webhook=${flag(report.keysPresent.webhookSecret)} adminToken=${flag(report.keysPresent.adminToken)}`
	);
	console.log(`Webhook URL: ${report.webhookUrl ?? 'not set'}`);
	console.log(`Billing events unique: ${flag(report.db.billingEventsStripeEventIdUnique)}`);
	console.log('\nCredit Packages:');
	if (report.packages.length === 0) {
		console.log(' (no active packages)');
		return;
	}
	for (const pkg of report.packages) {
		const statusColor = pkg.verified === 'OK' ? GREEN : pkg.verified === 'Empty' ? YELLOW : RED;
		console.log(
			` - ${pkg.name} (${pkg.id}) price=${pkg.priceId ?? 'n/a'} status=${statusColor}${pkg.verified}${RESET} product=${pkg.productName ?? 'n/a'} amount=${pkg.unitAmount ?? 'n/a'} ${pkg.currency ?? ''}`.trim()
		);
	}
}

function flag(value: boolean): string {
	return value ? `${GREEN}✔${RESET}` : `${RED}✖${RESET}`;
}

async function run(): Promise<void> {
	try {
		const exitCode = await stripeSanityCliMain();
		process.exit(exitCode);
	} catch (error) {
		console.error(`${RED}Stripe sanity checker crashed.${RESET}`);
		console.error(error);
		process.exit(1);
	}
}

const entryHref = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (entryHref && import.meta.url === entryHref) {
	void run();
}


