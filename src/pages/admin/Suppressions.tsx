import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { useAdminSuppressions } from '../../hooks/useAdminSuppressions';

const REASONS = [
	{ label: 'All reasons', value: 'all' },
	{ label: 'Hard bounce', value: 'hard_bounce' },
	{ label: 'Spam complaint', value: 'spam_complaint' },
	{ label: 'Provider unsubscribed', value: 'provider_unsub' },
	{ label: 'Manual', value: 'manual' }
];

const SOURCES = [
	{ label: 'All sources', value: 'all' },
	{ label: 'Resend', value: 'resend' },
	{ label: 'MailerSend', value: 'mailersend' },
	{ label: 'Admin', value: 'admin' },
	{ label: 'System', value: 'system' }
];

const DAY_PRESETS = [30, 90, 180, 365];

export default function AdminSuppressionsPage() {
	const [emailFilter, setEmailFilter] = useState('');
	const [reasonFilter, setReasonFilter] = useState('all');
	const [sourceFilter, setSourceFilter] = useState('all');
	const [days, setDays] = useState(180);

	const { items, loading, error, hasMore, loadMore, refresh, loadingMore, remove } = useAdminSuppressions({
		email: emailFilter.trim() || undefined,
		reason: reasonFilter === 'all' ? undefined : reasonFilter,
		source: sourceFilter === 'all' ? undefined : sourceFilter,
		days,
		pageSize: 50
	});

	const [removingId, setRemovingId] = useState<string | null>(null);

	const handleRemove = async (id: string) => {
		try {
			setRemovingId(id);
			await remove(id);
		} catch (err) {
			console.error('Failed to remove suppression', err);
		} finally {
			setRemovingId(null);
		}
	};

	return (
		<div className="min-h-screen bg-zinc-950 text-white">
			<div className="max-w-6xl mx-auto px-6 py-12 space-y-6">
				<header className="flex flex-wrap items-center justify-between gap-4">
					<div>
						<h1 className="text-3xl font-semibold">Admin · Suppressions</h1>
						<p className="text-sm text-zinc-400">Review deliverability suppressions and clear entries when safe.</p>
					</div>
					<button
						onClick={refresh}
						className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/10"
					>
						<RefreshCw size={16} />
						<span>Refresh</span>
					</button>
				</header>

				<section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 space-y-4">
					<div className="grid gap-4 md:grid-cols-4">
						<div>
							<label className="text-xs uppercase tracking-wide text-zinc-400">Email</label>
							<input
								value={emailFilter}
								onChange={(e) => setEmailFilter(e.target.value)}
								placeholder="user@example.com"
								className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
							/>
						</div>
						<div>
							<label className="text-xs uppercase tracking-wide text-zinc-400">Reason</label>
							<select
								value={reasonFilter}
								onChange={(e) => setReasonFilter(e.target.value)}
								className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
							>
								{REASONS.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="text-xs uppercase tracking-wide text-zinc-400">Source</label>
							<select
								value={sourceFilter}
								onChange={(e) => setSourceFilter(e.target.value)}
								className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
							>
								{SOURCES.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
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
					<div className="px-4 py-3 border-b border-white/10 text-sm font-semibold text-white">Suppression list</div>
					{loading ? (
						<div className="p-6 text-sm text-zinc-400">Loading suppressions…</div>
					) : items.length === 0 ? (
						<div className="p-6 text-sm text-zinc-400">No suppressions match the selected filters.</div>
					) : (
						<div className="overflow-x-auto">
							<table className="min-w-full text-sm text-zinc-300">
								<thead className="bg-zinc-900 text-xs uppercase text-zinc-500">
									<tr>
										<th className="px-4 py-3 text-left">Email</th>
										<th className="px-4 py-3 text-left">Reason</th>
										<th className="px-4 py-3 text-left">Source</th>
										<th className="px-4 py-3 text-left">Date</th>
										<th className="px-4 py-3 text-right">Actions</th>
									</tr>
								</thead>
								<tbody>
									{items.map((item) => (
										<tr key={item.id} className="border-t border-white/5">
											<td className="px-4 py-3 font-mono text-xs text-zinc-200">{item.email}</td>
											<td className="px-4 py-3 capitalize">{item.reason.replace('_', ' ')}</td>
											<td className="px-4 py-3 capitalize">{item.source}</td>
											<td className="px-4 py-3 text-zinc-400">
												{new Date(item.createdAt).toLocaleString()}
											</td>
											<td className="px-4 py-3 text-right">
												<button
													onClick={() => handleRemove(item.id)}
													disabled={removingId === item.id}
													className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
												>
													<Trash2 size={14} />
													<span>Remove</span>
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
		</div>
	);
}


