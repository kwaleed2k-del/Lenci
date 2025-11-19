import { enqueueEmail, claimDueJobs } from '../../src/server/services/emailQueue';

async function main() {
	const jobA = await enqueueEmail({
		userId: undefined,
		to: 'test@example.com',
		category: 'transactional',
		template: 'welcome',
		subject: 'Hello from smoke test',
		payload: { name: 'Smoke' },
		idempotencyKey: `smoke:${Date.now()}:a`
	});

	const jobB = await enqueueEmail({
		userId: undefined,
		to: 'test2@example.com',
		category: 'transactional',
		template: 'welcome',
		subject: 'Hello again',
		payload: { name: 'Smoke2' },
		idempotencyKey: `smoke:${Date.now()}:b`
	});

	console.log('Enqueued', jobA, jobB);

	const claimed = await claimDueJobs(10);
	console.log('Claimed jobs:', claimed.map((j) => j.id));
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error('Smoke test failed', err);
		process.exit(1);
	});


