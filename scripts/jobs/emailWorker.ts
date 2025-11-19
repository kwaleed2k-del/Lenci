import { claimDueJobs, markDead, markRetry, markSent, nextRunAt } from '../../src/server/services/emailQueue';
import { getProvider, defaultFrom } from '../../src/server/config/email';
import {
	renderEmailPreview,
	sendWelcome,
	maybeNotifyLowCredit,
	sendPaymentFailed,
	sendTopupReceipt,
	canSendMarketing
} from '../../src/server/services/emailService';
import { marketingHeaders } from '../../src/server/emails/headers';

type JobResult = {
	processed: number;
	sent: number;
	retried: number;
	dead: number;
};

async function processJob(job: Awaited<ReturnType<typeof claimDueJobs>>[number]): Promise<'sent' | 'retry' | 'dead'> {
	try {
		if (job.category === 'marketing') {
			if (!job.userId) {
				return 'dead';
			}
			const allowed = await canSendMarketing(job.userId, job.toEmail);
			if (!allowed) {
				await markSent(job.id);
				return 'sent';
			}
		}

		const provider = getProvider();
		await provider.send(job.toEmail, job.subject, String(job.payload.html ?? ''), String(job.payload.text ?? ''), job.headers);
		await markSent(job.id);
		return 'sent';
	} catch (error) {
		const message = String((error as Error)?.message ?? error);
		const nextRun = nextRunAt(job.attempts + 1);
		const attempts = await markRetry(job.id, message, nextRun);
		return attempts >= job.maxAttempts ? 'dead' : 'retry';
	}
}

async function runBatch(limit = 50): Promise<JobResult> {
	const jobs = await claimDueJobs(limit);
	const summary: JobResult = { processed: jobs.length, sent: 0, retried: 0, dead: 0 };
	for (const job of jobs) {
		const result = await processJob(job);
		if (result === 'sent') summary.sent += 1;
		if (result === 'retry') summary.retried += 1;
		if (result === 'dead') summary.dead += 1;
	}
	return summary;
}

runBatch()
	.then((result) => {
		console.log('[emailWorker] summary:', result);
		process.exit(0);
	})
	.catch((error) => {
		console.error('[emailWorker] error:', error);
		process.exit(1);
	});


