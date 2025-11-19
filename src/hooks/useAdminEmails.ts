import { useCallback, useEffect, useMemo, useState } from 'react';

export type AdminEmailLogItem = {
	id: string;
	userId: string;
	type: string;
	language: string;
	createdAt: string;
	payload: Record<string, unknown>;
};

export interface UseAdminEmailsParams {
	type?: string;
	userId?: string;
	days?: number;
	pageSize?: number;
}

type ResponseShape = {
	items: AdminEmailLogItem[];
	nextCursor: string | null;
};

function buildQueryString(params: UseAdminEmailsParams, cursor?: string | null) {
	const query = new URLSearchParams();
	if (params.type) query.set('type', params.type);
	if (params.userId) query.set('userId', params.userId);
	query.set('days', String(params.days ?? 30));
	query.set('limit', String(params.pageSize ?? 50));
	if (cursor) query.set('cursor', cursor);
	return query.toString();
}

export function useAdminEmails({ type, userId, days = 30, pageSize = 50 }: UseAdminEmailsParams) {
	const [items, setItems] = useState<AdminEmailLogItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [nextCursor, setNextCursor] = useState<string | null>(null);
	const [isLoadingMore, setIsLoadingMore] = useState(false);

	const filters = useMemo(
		() => ({ type, userId, days, pageSize }),
		[type, userId, days, pageSize]
	);

	const fetchPage = useCallback(
		async (cursor?: string | null, append = false) => {
			try {
				if (append) {
					setIsLoadingMore(true);
				} else {
					setLoading(true);
				}
				setError(null);
				const qs = buildQueryString({ type, userId, days, pageSize }, cursor ?? undefined);
				const response = await fetch(`/api/admin/emails?${qs}`, {
					credentials: 'include'
				});
				if (!response.ok) {
					throw new Error(`Request failed with status ${response.status}`);
				}
				const data = (await response.json()) as ResponseShape;
				setItems((prev) => (append ? [...prev, ...data.items] : data.items));
				setNextCursor(data.nextCursor);
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				setError(message);
				if (!append) setItems([]);
			} finally {
				setLoading(false);
				setIsLoadingMore(false);
			}
		},
		[type, userId, days, pageSize]
	);

	useEffect(() => {
		setItems([]);
		setNextCursor(null);
		void fetchPage(null, false);
	}, [fetchPage, filters]);

	const loadMore = useCallback(() => {
		if (!nextCursor || isLoadingMore) return;
		void fetchPage(nextCursor, true);
	}, [nextCursor, isLoadingMore, fetchPage]);

	return {
		items,
		loading,
		error,
		hasMore: Boolean(nextCursor),
		loadMore,
		refresh: () => fetchPage(null, false),
		loadingMore: isLoadingMore
	};
}

export function downloadEmailsCsv(params: UseAdminEmailsParams & { cursor?: string | null }) {
	const query = buildQueryString(
		{
			type: params.type,
			userId: params.userId,
			days: params.days,
			pageSize: params.pageSize
		},
		params.cursor
	);
	window.open(`/api/admin/emails.csv?${query}`, '_blank', 'noopener');
}


