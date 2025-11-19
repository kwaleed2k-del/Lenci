import { useCallback, useEffect, useMemo, useState } from 'react';

export type Suppression = {
	id: string;
	userId: string | null;
	email: string;
	reason: string;
	source: string;
	createdAt: string;
	details: Record<string, unknown>;
};

export interface UseAdminSuppressionsParams {
	email?: string;
	reason?: string;
	source?: string;
	days?: number;
	pageSize?: number;
}

type ResponseShape = {
	items: Suppression[];
	nextCursor: string | null;
};

function buildQuery(params: UseAdminSuppressionsParams, cursor?: string | null): string {
	const search = new URLSearchParams();
	if (params.email) search.set('email', params.email);
	if (params.reason) search.set('reason', params.reason);
	if (params.source) search.set('source', params.source);
	search.set('days', String(params.days ?? 180));
	search.set('limit', String(params.pageSize ?? 50));
	if (cursor) search.set('cursor', cursor);
	return search.toString();
}

export function useAdminSuppressions({
	email,
	reason,
	source,
	days = 180,
	pageSize = 50
}: UseAdminSuppressionsParams) {
	const [items, setItems] = useState<Suppression[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [nextCursor, setNextCursor] = useState<string | null>(null);
	const [loadingMore, setLoadingMore] = useState(false);

	const filters = useMemo(
		() => ({ email, reason, source, days, pageSize }),
		[email, reason, source, days, pageSize]
	);

	const fetchPage = useCallback(
		async (cursor?: string | null, append = false) => {
			try {
				if (append) setLoadingMore(true);
				else setLoading(true);
				setError(null);
				const qs = buildQuery({ email, reason, source, days, pageSize }, cursor ?? undefined);
				const response = await fetch(`/api/admin/suppressions?${qs}`, {
					credentials: 'include'
				});
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}`);
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
				setLoadingMore(false);
			}
		},
		[email, reason, source, days, pageSize]
	);

	useEffect(() => {
		void fetchPage(null, false);
	}, [fetchPage, filters]);

	const loadMore = useCallback(() => {
		if (!nextCursor || loadingMore) return;
		void fetchPage(nextCursor, true);
	}, [nextCursor, loadingMore, fetchPage]);

	const remove = useCallback(
		async (id: string) => {
			const response = await fetch(`/api/admin/suppressions/${id}`, {
				method: 'DELETE',
				credentials: 'include'
			});
			if (!response.ok) {
				const text = await response.text();
				throw new Error(text || `HTTP ${response.status}`);
			}
			setItems((prev) => prev.filter((item) => item.id !== id));
		},
		[]
	);

	return {
		items,
		loading,
		error,
		hasMore: Boolean(nextCursor),
		loadMore,
		refresh: () => fetchPage(null, false),
		loadingMore,
		remove
	};
}


