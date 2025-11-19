import { admin } from '../supabaseAdmin';

export type EmailCategory = 'transactional' | 'marketing';
export type EmailTemplate =
	| 'welcome'
	| 'low_credit'
	| 'payment_failed'
	| 'topup_receipt'
	| 'newsletter';

export interface EnqueueInput {
	userId?: string;
	to: string;
	category: EmailCategory;
	template: EmailTemplate;
	subject: string;
	payload?: Record<string, unknown>;
	headers?: Record<string, string>;
	idempotencyKey?: string | null;
	runAt?: Date;
	maxAttempts?: number;
}

export interface EmailJobRow {
	id: string;
	user_id: string | null;
	to_email: string;
	category: EmailCategory;
	template: EmailTemplate;
	subject: string;
	payload: Record<string, unknown>;
	headers: Record<string, unknown>;
	idempotency_key: string | null;
	status: 'pending' | 'sending' | 'sent' | 'dead';
	attempts: number;
	max_attempts: number;
	last_error: string | null;
	run_at: string;
	sent_at: string | null;
	created_at: string;
}

function assertNonEmpty(value: string, field: string): string {
	if (!value || !value.trim()) {
		throw new Error(`${field} is required`);
	}
	return value.trim();
}

export function nextRunAt(attempts: number): Date {
	const baseMs = 5 * 60 * 1000;
	const maxMs = 6 * 60 * 60 * 1000;
	const delay = Math.min(maxMs, baseMs * Math.pow(2, Math.max(0, attempts)));
	return new Date(Date.now() + delay);
}

export async function enqueueEmail(input: EnqueueInput): Promise<string> {
	const toEmail = assertNonEmpty(input.to, 'to');
	const subject = assertNonEmpty(input.subject, 'subject');
	const payload = input.payload ?? {};
	const headers = input.headers ?? {};
	const runAt = input.runAt ?? new Date();
	const maxAttempts = input.maxAttempts ?? 6;
	const idempotencyKey = (input.idempotencyKey ?? null) || null;

	const { data, error } = await admin
		.from('email_jobs')
		.insert({
			user_id: input.userId ?? null,
			to_email: toEmail.toLowerCase(),
			category: input.category,
			template: input.template,
			subject,
			payload,
			headers,
			idempotency_key: idempotencyKey,
			run_at: runAt.toISOString(),
			max_attempts: maxAttempts
		})
		.select('id')
		.single();

	if (error) {
		if (error.code === '23505' && idempotencyKey) {
			const existing = await admin
				.from('email_jobs')
				.select('id')
				.eq('idempotency_key', idempotencyKey)
				.single();
			if (existing.data?.id) return existing.data.id;
		}
		throw new Error(`enqueueEmail failed: ${error.message}`);
	}

	return data!.id as string;
}

export async function claimDueJobs(limit = 50): Promise<EmailJobRow[]> {
	const { data, error } = await admin.rpc<EmailJobRow[]>('email_jobs_claim', {
		p_limit: limit
	});
	if (error) {
		throw new Error(`claimDueJobs failed: ${error.message}`);
	}
	return data ?? [];
}

export async function markSent(id: string): Promise<void> {
	const { error } = await admin
		.from('email_jobs')
		.update({
			status: 'sent',
			sent_at: new Date().toISOString(),
			last_error: null
		})
		.eq('id', id);
	if (error) throw new Error(`markSent failed: ${error.message}`);
}

export async function markRetry(id: string, err: unknown, attempts: number): Promise<void> {
	const runAt = nextRunAt(attempts);
	const message = truncateError(err);
	const { error } = await admin.rpc('email_jobs_set_retry', {
		p_id: id,
		p_attempts: attempts,
		p_run_at: runAt.toISOString(),
		p_error: message
	});
	if (error) throw new Error(`markRetry failed: ${error.message}`);
}

export async function markDead(id: string, err: unknown): Promise<void> {
	const message = truncateError(err);
	const { error } = await admin
		.from('email_jobs')
		.update({
			status: 'dead',
			last_error: message
		})
		.eq('id', id);
	if (error) throw new Error(`markDead failed: ${error.message}`);
}

function truncateError(err: unknown): string {
	const raw = typeof err === 'string' ? err : (err as Error)?.message ?? String(err);
	return raw.length > 1000 ? raw.slice(0, 1000) : raw;
}

import { admin } from '../supabaseAdmin';
export type EmailJobCategory = 'transactional' | 'marketing';

export interface EnqueueEmailInput {
	userId?: string | null;
	toEmail: string;
	category: EmailJobCategory;
	template: string;
	subject: string;
	payload: Record<string, unknown>;
	headers?: Record<string, string>;
	idempotencyKey?: string;
	runAt?: Date;
	maxAttempts?: number;
}

export interface EmailJobRecord {
	id: string;
	userId: string | null;
	toEmail: string;
	category: EmailJobCategory;
	template: string;
	subject: string;
	payload: Record<string, unknown>;
	headers: Record<string, string>;
	attempts: number;
	maxAttempts: number;
	status: string;
	runAt: string;
	lastError: string | null;
}

export async function enqueueEmail(input: EnqueueEmailInput): Promise<string> {
	const { data, error } = await admin
		.from('email_jobs')
		.insert({
			user_id: input.userId ?? null,
			to_email: input.toEmail.toLowerCase(),
			category: input.category,
			template: input.template,
			subject: input.subject,
			payload: input.payload,
			headers: input.headers ?? {},
			idempotency_key: input.idempotencyKey ?? null,
			run_at: input.runAt?.toISOString() ?? new Date().toISOString(),
			max_attempts: input.maxAttempts ?? 6
		})
		.select('id')
		.single();

	if (error) {
		if (error.code === '23505' && input.idempotencyKey) {
			// Already enqueued; fetch existing id via select
			const existing = await admin
				.from('email_jobs')
				.select('id')
				.eq('idempotency_key', input.idempotencyKey)
				.single();
			if (existing.data?.id) return existing.data.id;
		}
		throw new Error(`Failed to enqueue email job: ${error.message}`);
	}

	return data!.id as string;
}

export async function claimDueJobs(limit = 50): Promise<EmailJobRecord[]> {
	const { data, error } = await admin.rpc('claim_email_jobs', {
		p_limit: limit
	});
	if (error) {
		throw new Error(`Failed to claim jobs: ${error.message}`);
	}
	return (data as EmailJobRecord[]) ?? [];
}

export function nextRunAt(attempts: number): Date {
	const baseMinutes = 5;
	const exp = Math.min(attempts, 8);
	const minutes = Math.min(baseMinutes * Math.pow(2, exp), 360);
	return new Date(Date.now() + minutes * 60 * 1000);
}

export async function markSent(id: string): Promise<void> {
	const { error } = await admin
		.from('email_jobs')
		.update({
			status: 'sent',
			sent_at: new Date().toISOString(),
			last_error: null
		})
		.eq('id', id);
	if (error) throw new Error(`Failed to mark sent: ${error.message}`);
}

export async function markRetry(id: string, errorMessage: string, nextRun: Date): Promise<number> {
	const { data, error } = await admin.rpc('increment_email_job_attempts', { p_id: id });
	if (error) throw new Error(error.message);
	const nextAttempts = data as number;
	const { error: updateError } = await admin
		.from('email_jobs')
		.update({
			status: 'pending',
			run_at: nextRun.toISOString(),
			last_error: errorMessage
		})
		.eq('id', id);
	if (updateError) throw new Error(`Failed to mark retry: ${updateError.message}`);
	return nextAttempts;
}

export async function markDead(id: string, errorMessage: string): Promise<void> {
	const { error } = await admin
		.from('email_jobs')
		.update({
			status: 'dead',
			last_error: errorMessage
		})
		.eq('id', id);
	if (error) throw new Error(`Failed to mark dead: ${error.message}`);
}


