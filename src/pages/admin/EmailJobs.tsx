import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, Play, Repeat2, Trash2 } from 'lucide-react';
import {
	useAdminEmailJobs,
	retryEmailJob,
	deleteEmailJob,
	runEmailJobTick
} from '../../hooks/useAdminEmailJobs';
import type { EmailTemplate } from '../../server/services/emailQueue';

const STATUS_OPTIONS = ['all', 'pending', 'sending', 'sent', 'dead'] as const;
const TEMPLATE_OPTIONS: Array<EmailTemplate | 'all'> = [
	'all',
	'welcome',
	'low_credit',
	'payment_failed',
	'topup_receipt',
	'newsletter'
];
const DAY_OPTIONS = [30, 90, 180, 365];

export default function AdminEmailJobsPage() {
	const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>('pending');
	const [template, setTemplate] = useState<(typeof TEMPLATE_OPTIONS)[number]>('all');
	const [email, setEmail] = useState('');
	const [days, setDays] = useState(90);

	const { items, loading, error, hasMore, loadMore, refresh, loadingMore } = useAdminEmailJobs({
		status,
		template,
		email: email.trim() || undefined,
		days,
		limit: 50
	});
	const [actionMessage, setActionMessage] = useState<string | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);

	const handleRetry = async (jobId: string) => {
		try {
			setBusyId(jobId);
			setActionError(null);
			await retryEmailJob(jobId);
			await refresh();
			setActionMessage('Job re-queued.');
		} catch (err) {
			setActionError(String((err as Error).message));
		} finally {
			setBusyId(null);
		}
	}

	const handleDelete = async (jobId: string) => {
		try {
			setBusyId(jobId);
			setActionError(null);
			await deleteEmailJob(jobId);
			await refresh();
			setActionMessage('Job deleted.');
		} catch (err) {
			setActionError(String((err as Error).message));
		} finally {
			setBusyId(null);
		}
	}

	const handleTick = async () => {
		try {
			setActionError(null);
			setActionMessage(null);
			await runEmailJobTick(25);
			setActionMessage('Worker tick executed.');
			await refresh();
		} catch (err) {
			setActionError(String((err as Error).message));
		}
	}

	return (
		<div className="min-h-screen bg-zinc-950 text-white">
			<div className="max-w-6xl mx-auto px-6 py-12 space-y-6">
				<header className="flex flex-wrap items-center justify-between gap-4">
					<div>
						<h1 className="text-3xl font-semibold">Admin · Email Jobs</h1>
						<p className="text-sm text-zinc-400">
							Monitor queued emails, retry failures, and run manual ticks.
						</p>
					</div>
					<div className="flex gap-2">
						<button
							onClick={refresh}
							className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/10"
						>
							<RefreshCw size={16} />
							<span>Refresh</span>
						</button>
						<button
							onClick={handleTick}
							className="inline-flex items-center gap-2 rounded-lg border border-violet-500/40 px-3 py-1.5 text-sm text-violet-200 hover:bg-violet-500/10"
						>
							<Play size={16} />
							<span>Run tick</span>
						</button>
					</div>
				</header>

				<section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 space-y-4">
					<div className="grid gap-4 md:grid-cols-3">
						<div>
							<label className="text-xs uppercase tracking-wide text-zinc-400">Status</label>
							<select
								value={status}
								onChange={(e) => setStatus(e.target.value as typeof STATUS_OPTIONS[number])}
								className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
							>
								{STATUS_OPTIONS.map((s) => (
									<option key={s} value={s}>
										{s}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="text-xs uppercase tracking-wide text-zinc-400">Template</label>
							<select
								value={template}
								onChange={(e) => setTemplate(e.target.value as typeof TEMPLATE_OPTIONS[number])}
								className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
							>
								{TEMPLATE_OPTIONS.map((t) => (
									<option key={t} value={t}>
										{t}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="text-xs uppercase tracking-wide text-zinc-400">Recipient email</label>
							<input
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="user@example.com"
								className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
							/>
						</div>
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<span className="text-xs text-zinc-400">Days</span>
						{DAY_OPTIONS.map((d) => (
							<button
								key={d}
								onClick={() => setDays(d)}
								className={`rounded-full px-3 py-1 text-xs ${
									days === d ? 'bg-violet-600 text-white' : 'bg-zinc-900 text-zinc-300'
								}`}
							>
								{d}d
							</button>
						))}
					</div>
				</section>

				{error && (
					<div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200 flex items-center gap-2">
						<AlertTriangle size={16} />
						<span>{error}</span>
					</div>
				)}
				{actionError && (
					<div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200 flex items-center gap-2">
						<AlertTriangle size={16} />
						<span>{actionError}</span>
					</div>
				)}
				{actionMessage && (
					<div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
						{actionMessage}
					</div>
				)}

				<section className="rounded-2xl border border-white/10 bg-zinc-900/70 overflow-hidden">
					<div className="px 4 py-3 border-b border-white/10 text-sm font-semibold text-white">
						Email jobs
					</div>
					{loading ? (
						<div className="p-6 text-sm text-zinc-400">Loading jobs…</div>
					) : items.length === 0 ? (
						<div className="p-6 text-sm text-zinc-400">No jobs match the filters.</div>
					) : (
						<div className="overflow-x-auto">
							<table className="min-w-full text-sm text-zinc-300">
								<thead className="bg-zinc-900 text-xs uppercase text-zinc-500">
									<tr>
										<th className="px-4 py-3 text-left">To</th>
										<th className="px-4 py-3 text-left">Category</th>
										<th className="px-4 py-3 text-left">Template</th>
										<th className="px-4 py-3 text-left">Status</th>
										<th className="px-4 py-3 text-left">Attempts</th>
										<th className="px-4 py-3 text-left">Next run</th>
										<th className="px-4 py-3 text-left">Last error</th>
										<th className="px-4 py-3 text-right">Actions</th>
									</tr>
								</thead>
								<tbody>
									{items.map((job) => (
										<tr key={job.id} className="border-t border-white/5">
											<td className="px-4 py-3 font-mono text-xs">{job.toEmail}</td>
											<td className="px-4 py-3 capitalize">{job.category}</td>
											<td className="px-4 py-3">{job.template}</td>
											<td className="px-4 py-3 capitalize">{job.status}</td>
											<td className="px-4 py-3">
												{job.attempts} / {job.maxAttempts}
											</td>
											<td className="px-4 py-3 text-zinc-400">
												{job.status === 'sent'
													? job.sentAt
														? new Date(job.sentAt).toLocaleString()
														: '—'
													: new Date(job.runAt).toLocaleString()}
											</td>
											<td className="px-4 py-3 text-xs text-red-400 line-clamp-2">
												{job.lastError ?? '—'}
											</td>
											<td className="px-4 py-3 text-right space-x-2">
												<button
													onClick={() => handleRetry(job.id)}
													disabled={busyId === job.id}
													className="inline-flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-xs text-white hover:bg-white/10 disabled:opacity-40"
												>
													<Repeat2 size={14} />
													Retry
												</button>
												<button
													onClick={() => handleDelete(job.id)}
													disabled={busyId === job.id}
													className="inline-flex items-center gap-1 rounded border border-red-500/40 px-2 py-1 text-xs text-red-200 hover:bg-red-500/10 disabled:opacity-40"
												>
													<Trash2 size={14} />
													Delete
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

