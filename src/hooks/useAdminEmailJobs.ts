import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EmailTemplate } from '../server/services/emailQueue';

export type EmailJobStatus = 'pending' | 'sending' | 'sent' | 'dead';

export interface AdminEmailJob {
	id: string;
	userId: string | null;
	toEmail: string;
	category: string;
	template: string;
	subject: string;
	status: EmailJobStatus;
	attempts: number;
	maxAttempts: number;
	runAt: string;
	lastError: string | null;
	createdAt: string;
	sentAt: string | null;
}

interface JobsResponse {
	items: AdminEmailJob[];
	nextCursor: string | null;
}

export interface JobsFilter {
	status?: EmailJobStatus | 'all';
	template?: EmailTemplate | 'all';
	email?: string;
	days?: number;
	limit?: number;
}

export function useAdminEmailJobs(filters: JobsFilter) {
	const { status = 'all', template = 'all', email, limit = 50, days = 90 } = filters;
	const [items, setItems] = useState<AdminEmailJob[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [nextCursor, setNextCursor] = useState<string | null>(null);
	const [loadingMore, setLoadingMore] = useState(false);

	const query = useMemo(() => {
		const params = new URLSearchParams();
		if (status && status !== 'all') params.set('status', status);
		if (template && template !== 'all') params.set('template', template);
		if (email) params.set('email', email);
		params.set('days', String(days));
		params.set('limit', String(limit));
		return params;
	}, [status, template, email, days, limit]);

	const fetchJobs = useCallback(
		async (cursor?: string | null, append = false) => {
			try {
				if (append) setLoadingMore(true);
				else setLoading(true);
				setError(null);

				const params = new URLSearchParams(query);
				if (cursor) params.set('cursor', cursor);

				const response = await fetch(`/api/admin/email-jobs?${params.toString()}`, {
					credentials: 'include'
				});
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}`);
				}
				const data = (await response.json()) as JobsResponse;
				setItems((prev) => (append ? [...prev, ...data.items] : data.items));
				setNextCursor(data.nextCursor);
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				setError(message);
				if (!append) setItems([]);
			} finally {
				setLoading(false);
				setLoadingMore(false);
			}
		},
		[query]
	);

	useEffect(() => {
		void fetchJobs(null, false);
	}, [fetchJobs]);

	const loadMore = useCallback(() => {
		if (!nextCursor || loadingMore) return;
		void fetchJobs(nextCursor, true);
	}, [nextCursor, loadingMore, fetchJobs]);

	return {
		items,
		loading,
		error,
		hasMore: Boolean(nextCursor),
		loadMore,
		refresh: () => fetchJobs(null, false),
		loadingMore
	};
}

export async function retryEmailJob(id: string): Promise<void> {
	const response = await fetch(`/api/admin/email-jobs/${id}/retry`, {
		method: 'POST',
		credentials: 'include'
	});
	if (!response.ok) {
		const text = await response.text();
		throw new Error(text || `HTTP ${response.status}`);
	}
}

export async function deleteEmailJob(id: string): Promise<void> {
	const response = await fetch(`/api/admin/email-jobs/${id}`, {
		method: 'DELETE',
		credentials: 'include'
	});
	if (!response.ok) {
		const text = await response.text();
		throw new Error(text || `HTTP ${response.status}`);
	}
}

export async function runEmailJobTick(limit = 50): Promise<void> {
	const response = await fetch(`/api/admin/email-jobs/tick?limit=${limit}`, {
		method: 'POST',
		credentials: 'include'
	});
	if (!response.ok) {
		const text = await response.text();
		throw new Error(text || `HTTP ${response.status}`);
	}
}


