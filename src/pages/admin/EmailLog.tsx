import React, { useMemo, useState } from 'react';
import { AlertTriangle, Eye, FileDown, RefreshCw } from 'lucide-react';
import { useAdminEmails, downloadEmailsCsv, AdminEmailLogItem } from '../../hooks/useAdminEmails';

const TYPE_OPTIONS = [
	{ label: 'All types', value: 'all' },
	{ label: 'Welcome', value: 'welcome' },
	{ label: 'Low credit', value: 'low_credit' },
	{ label: 'Payment failed', value: 'payment_failed' },
	{ label: 'Top-up receipt', value: 'topup_receipt' }
];

const DAY_PRESETS = [7, 30, 90, 180, 365];

type PreviewContent = { subject: string; html: string; text: string };

export default function AdminEmailLogPage() {
	const [typeFilter, setTypeFilter] = useState('all');
	const [userId, setUserId] = useState('');
	const [days, setDays] = useState(30);

	const appliedType = typeFilter === 'all' ? undefined : typeFilter;
	const appliedUserId = userId.trim() || undefined;

	const { items, loading, error, hasMore, loadMore, refresh, loadingMore } = useAdminEmails({
		type: appliedType,
		userId: appliedUserId,
		days,
		pageSize: 50
	});

	const [selectedEmail, setSelectedEmail] = useState<AdminEmailLogItem | null>(null);
	const [preview, setPreview] = useState<PreviewContent | null>(null);
	const [previewLoading, setPreviewLoading] = useState(false);
	const [previewError, setPreviewError] = useState<string | null>(null);

	const handlePreview = async (email: AdminEmailLogItem) => {
		setSelectedEmail(email);
		setPreview(null);
		setPreviewError(null);
		setPreviewLoading(true);
		try {
			const params = buildPreviewParams(email);
			const response = await fetch(`/api/admin/email-preview?${params}`, {
				credentials: 'include'
			});
			if (!response.ok) {
				throw new Error(`Preview failed (${response.status})`);
			}
			const data = (await response.json()) as { subject: string; html: string; text: string };
			setPreview(data);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			setPreviewError(message);
		} finally {
			setPreviewLoading(false);
		}
	};

	const closePreview = () => {
		setSelectedEmail(null);
		setPreview(null);
		setPreviewError(null);
		setPreviewLoading(false);
	};

	const exportCsv = () => {
		downloadEmailsCsv({ type: appliedType, userId: appliedUserId, days, pageSize: 500 });
	};

	const summaryMap = useMemo(
		() =>
			new Map(
				items.map((item) => [item.id, summarizeEmail(item)] as [string, string])
			),
		[items]
	);

	return (
		<div className="min-h-screen bg-zinc-950 text-white">
			<div className="max-w-6xl mx-auto px-6 py-12 space-y-6">
				<header className="flex flex-wrap items-center justify-between gap-4">
					<div>
						<h1 className="text-3xl font-semibold">Admin · Email log</h1>
						<p className="text-sm text-zinc-400">Audit transactional emails, export CSV, and preview templates.</p>
					</div>
					<div className="flex items-center gap-2">
						<button
							onClick={refresh}
							className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/10"
						>
							<RefreshCw size={16} />
							<span>Refresh</span>
						</button>
						<button
							onClick={exportCsv}
							className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/10"
						>
							<FileDown size={16} />
							<span>Export CSV</span>
						</button>
					</div>
				</header>

				<section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 space-y-4">
					<div className="grid gap-4 md:grid-cols-3">
						<div>
							<label className="text-xs uppercase tracking-wide text-zinc-400">Type</label>
							<select
								value={typeFilter}
								onChange={(e) => setTypeFilter(e.target.value)}
								className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
							>
								{TYPE_OPTIONS.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="text-xs uppercase tracking-wide text-zinc-400">User ID</label>
							<input
								value={userId}
								onChange={(e) => setUserId(e.target.value)}
								placeholder="Optional"
								className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
							/>
						</div>
						<div>
							<label className="text-xs uppercase tracking-wide text-zinc-400">Days</label>
							<div className="mt-1 flex flex-wrap gap-2">
								{DAY_PRESETS.map((preset) => (
									<button
										key={preset}
										type="button"
										onClick={() => setDays(preset)}
										className={`rounded-lg px-3 py-1.5 text-sm ${
											days === preset
												? 'bg-violet-600 text-white'
												: 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
										}`}
									>
										{preset}d
									</button>
								))}
							</div>
						</div>
					</div>
				</section>

				{error && (
					<div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200 flex items-center gap-2">
						<AlertTriangle size={16} />
						<span>{error}</span>
					</div>
				)}

				<section className="rounded-2xl border border-white/10 bg-zinc-900/70 overflow-hidden">
					<div className="px-4 py-3 border-b border-white/10 text-sm font-semibold text-white flex items-center gap-2">
						<Eye size={16} />
						<span>Email events</span>
					</div>
					{loading ? (
						<div className="p-6 text-sm text-zinc-400">Loading email events…</div>
					) : items.length === 0 ? (
						<div className="p-6 text-sm text-zinc-400">No email events for the selected filters.</div>
					) : (
						<div className="overflow-x-auto">
							<table className="min-w-full text-sm text-zinc-300">
								<thead className="bg-zinc-900 text-xs uppercase text-zinc-500">
									<tr>
										<th className="px-4 py-3 text-left">Date</th>
										<th className="px-4 py-3 text-left">Type</th>
										<th className="px-4 py-3 text-left">User</th>
										<th className="px-4 py-3 text-left">Summary</th>
										<th className="px-4 py-3 text-right">Actions</th>
									</tr>
								</thead>
								<tbody>
									{items.map((item) => (
										<tr key={item.id} className="border-t border-white/5">
											<td className="px-4 py-3">
												<div className="flex flex-col">
													<span className="text-white text-sm">
														{new Date(item.createdAt).toLocaleString()}
													</span>
												</div>
											</td>
											<td className="px-4 py-3 capitalize">{item.type.replace('_', ' ')}</td>
											<td className="px-4 py-3 font-mono text-xs text-zinc-400">{item.userId}</td>
											<td className="px-4 py-3 text-zinc-200">
												{summaryMap.get(item.id) || '\u2014'}
											</td>
											<td className="px-4 py-3 text-right">
												<button
													onClick={() => handlePreview(item)}
													className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/10"
												>
													<Eye size={14} />
													<span>Preview</span>
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</section>

				{hasMore && (
					<div className="flex justify-center">
						<button
							onClick={loadMore}
							disabled={loadingMore}
							className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50"
						>
							{loadingMore ? 'Loading…' : 'Load more'}
						</button>
					</div>
				)}
			</div>

			{selectedEmail && (
				<PreviewDrawer
					email={selectedEmail}
					preview={preview}
					onClose={closePreview}
					loading={previewLoading}
					error={previewError}
				/>
			)}
		</div>
	);
}

function summarizeEmail(item: AdminEmailLogItem): string {
	const payload = (item.payload ?? {}) as Record<string, unknown>;
	switch (item.type) {
		case 'welcome':
			return 'Welcome email';
		case 'low_credit': {
			const balance = parseNumeric(payload.balance);
			return balance !== null ? `Low credit · Balance ${balance} credits` : 'Low credit';
		}
		case 'payment_failed': {
			const amount =
				parseNumeric(payload.amount_due_cents) ??
				parseNumeric(payload.amount_cents) ??
				null;
			return amount !== null
				? `Payment failed · $${(amount / 100).toFixed(2)}`
				: 'Payment failed';
		}
		case 'topup_receipt': {
			const credits = parseNumeric(payload.credits);
			const amount = parseNumeric(payload.amount_cents);
			const currency = typeof payload.currency === 'string' ? payload.currency.toUpperCase() : 'USD';
			const parts = ['Top-up'];
			if (credits !== null) parts.push(`${credits} credits`);
			if (amount !== null) parts.push(`${(amount / 100).toFixed(2)} ${currency}`);
			return parts.join(' · ');
		}
		default:
			return 'Email';
	}
}

function buildPreviewParams(item: AdminEmailLogItem): string {
	const params = new URLSearchParams();
	params.set('kind', item.type);
	if (item.userId) params.set('userId', item.userId);
	const payload = (item.payload ?? {}) as Record<string, unknown>;

	if (item.type === 'low_credit') {
		const balance = parseNumeric(payload.balance);
		if (balance !== null) params.set('balance', String(balance));
	}

	if (item.type === 'payment_failed') {
		const amount =
			parseNumeric(payload.amount_due_cents) ??
			parseNumeric(payload.amount_cents);
		if (amount !== null) params.set('amountCents', String(amount));
		const invoice =
			(typeof payload.invoice_number === 'string' && payload.invoice_number) ||
			(typeof payload.stripe_object_id === 'string' && payload.stripe_object_id);
		if (invoice) params.set('invoiceNumber', invoice);
	}

	if (item.type === 'topup_receipt') {
		const amount = parseNumeric(payload.amount_cents);
		const credits = parseNumeric(payload.credits);
		if (amount !== null) params.set('amountCents', String(amount));
		if (credits !== null) params.set('credits', String(credits));
		const currency = typeof payload.currency === 'string' ? payload.currency : null;
		if (currency) params.set('currency', currency);
		const receipt = typeof payload.receipt_url === 'string' ? payload.receipt_url : null;
		if (receipt) params.set('receiptUrl', receipt);
		const kind = typeof payload.kind === 'string' ? payload.kind : null;
		if (kind) params.set('receiptKind', kind);
	}

	return params.toString();
}

function parseNumeric(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim().length > 0) {
		const num = Number(value);
		return Number.isFinite(num) ? num : null;
	}
	return null;
}

function PreviewDrawer({
	email,
	preview,
	loading,
	error,
	onClose
}: {
	email: AdminEmailLogItem;
	preview: PreviewContent | null;
	loading: boolean;
	error: string | null;
	onClose: () => void;
}) {
	return (
		<div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center px-4">
			<div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl overflow-hidden">
				<div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
					<div>
						<p className="text-sm text-zinc-400">Preview</p>
						<h2 className="text-lg font-semibold text-white capitalize">
							{email.type.replace('_', ' ')}
						</h2>
					</div>
					<button
						onClick={onClose}
						className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/10"
					>
						Close
					</button>
				</div>
				<div className="max-h-[70vh] overflow-y-auto px-4 py-4 space-y-4">
					<p className="text-xs text-zinc-500 font-mono break-all">ID: {email.id}</p>
					{loading && <p className="text-sm text-zinc-400">Rendering preview…</p>}
					{error && (
						<div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200 flex items-center gap-2">
							<AlertTriangle size={16} />
							<span>{error}</span>
						</div>
					)}
					{preview && !loading && !error && (
						<>
							<div>
								<p className="text-xs text-zinc-500 uppercase tracking-wide">Subject</p>
								<p className="text-base text-white">{preview.subject}</p>
							</div>
							<div>
								<p className="text-xs text-zinc-500 uppercase tracking-wide">HTML</p>
								<div
									className="rounded-lg border border-white/10 bg-white text-black p-4 text-sm"
									dangerouslySetInnerHTML={{ __html: preview.html }}
								/>
							</div>
							<div>
								<p className="text-xs text-zinc-500 uppercase tracking-wide">Text</p>
								<pre className="rounded-lg border border-white/10 bg-zinc-900 p-3 text-xs text-zinc-200 whitespace-pre-wrap">
									{preview.text}
								</pre>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
}


