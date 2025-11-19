import React, { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { usePlan } from '../hooks/usePlan';
import { useCreditBalance } from '../hooks/useCreditBalance';
import { LowCreditBanner } from '../components/billing/LowCreditBanner';
import { CreditBalance } from '../components/billing/CreditBalance';
import { CreditHistoryModal } from '../components/billing/CreditHistoryModal';
import { openPortal, startTopup } from '../client/billingClient';
import { InvoicesTable } from '../components/billing/InvoicesTable';
import { useInvoices } from '../hooks/useInvoices';
import { UI_PLANS } from '../components/billing/PricingCards';
import { useTopupOptions } from '../hooks/useTopupOptions';
import { useBillingHistory } from '../hooks/useBillingHistory';
import { useAutoTopup } from '../hooks/useAutoTopup';
import { useMe } from '../hooks/useMe';
import { usePurchases } from '../hooks/usePurchases';

export default function BillingSettings() {
	const { code, features, loading, error } = usePlan();
	const { balance, refresh: refreshBalance } = useCreditBalance();
	const { refresh: refreshHistory } = useBillingHistory();
	const [historyOpen, setHistoryOpen] = useState(false);
	const [userId, setUserId] = useState<string | null>(null);
	const [portalLoading, setPortalLoading] = useState(false);
	const [actionError, setActionError] = useState<string | null>(null);
	const [showSuccessToast, setShowSuccessToast] = useState(false);
	const [autoTopupSettings, setAutoTopupSettings] = useState<{ enabled: boolean; priceId: string | null; threshold: number; lowCreditEmailsEnabled: boolean } | null>(null);
	const { invoices, loading: invoicesLoading, error: invoicesError, hasMore, loadMore } = useInvoices();
	const { options: topupOptions, loading: topupLoading, error: topupError } = useTopupOptions();
	const { settings: autoTopupSettingsData, loading: autoTopupLoading, error: autoTopupError, save: saveAutoTopup } = useAutoTopup();
	const { purchases, loading: purchasesLoading, error: purchasesError } = usePurchases(90, 50);
	const { profile, loading: meLoading, error: meError, save: saveMe } = useMe();
	const [marketingOptIn, setMarketingOptIn] = useState(false);
	const [marketingOptInAt, setMarketingOptInAt] = useState<string | null>(null);
	const [marketingSaving, setMarketingSaving] = useState(false);
	const [marketingSuccess, setMarketingSuccess] = useState(false);

	// Sync hook data to local state for controlled inputs
	useEffect(() => {
		if (autoTopupSettingsData) {
			setAutoTopupSettings(autoTopupSettingsData);
		}
	}, [autoTopupSettingsData]);

	useEffect(() => {
		if (profile) {
			setMarketingOptIn(profile.marketingOptIn);
			setMarketingOptInAt(profile.marketingOptInAt);
		}
	}, [profile]);

	useEffect(() => {
		void (async () => {
			const { data } = await supabase.auth.getUser();
			setUserId(data.user?.id ?? null);
		})();
	}, []);

	// Handle purchase success/cancel from query params
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const purchase = params.get('purchase');
		if (purchase === 'success') {
			setShowSuccessToast(true);
			// Refresh balance and history
			refreshBalance();
			refreshHistory();
			// Remove query param
			window.history.replaceState({}, '', '/billing');
			// Auto-hide toast after 5 seconds
			setTimeout(() => setShowSuccessToast(false), 5000);
		} else if (purchase === 'cancel') {
			// Remove query param
			window.history.replaceState({}, '', '/billing');
		}
	}, [refreshBalance, refreshHistory]);

	const handlePortal = async () => {
		try {
			setActionError(null);
			setPortalLoading(true);
			await openPortal();
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			setActionError(message);
			setPortalLoading(false);
		}
	};

	const handleTopup = async (priceId: string) => {
		try {
			setActionError(null);
			await startTopup(priceId);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			setActionError(message);
		}
	};

	const [autoTopupSaving, setAutoTopupSaving] = useState(false);
	const [alertThresholdSaving, setAlertThresholdSaving] = useState(false);
	
	const handleAutoTopupSave = async () => {
		if (!autoTopupSettings) return;
		try {
			setActionError(null);
			setAutoTopupSaving(true);
			await saveAutoTopup({
				enabled: autoTopupSettings.enabled,
				priceId: autoTopupSettings.priceId,
				threshold: autoTopupSettings.threshold
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			setActionError(message);
		} finally {
			setAutoTopupSaving(false);
		}
	};

	const handleAlertThresholdSave = async () => {
		if (!autoTopupSettings) return;
		try {
			setActionError(null);
			setAlertThresholdSaving(true);
			await saveAutoTopup({
				threshold: autoTopupSettings.threshold,
				lowCreditEmailsEnabled: autoTopupSettings.lowCreditEmailsEnabled
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			setActionError(message);
		} finally {
			setAlertThresholdSaving(false);
		}
	};

	const handleMarketingSave = async () => {
		try {
			setActionError(null);
			setMarketingSaving(true);
			setMarketingSuccess(false);
			const updated = await saveMe({ marketingOptIn });
			setMarketingOptIn(updated.marketingOptIn);
			setMarketingOptInAt(updated.marketingOptInAt);
			setMarketingSuccess(true);
			setTimeout(() => setMarketingSuccess(false), 4000);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			setActionError(message);
		} finally {
			setMarketingSaving(false);
		}
	};

	const planMeta = UI_PLANS[code] ?? UI_PLANS.free;

	return (
		<div className="min-h-screen bg-zinc-950 text-white">
			<div className="max-w-6xl mx-auto px-6 py-12 space-y-8">
				<section className="rounded-3xl border border-white/10 bg-gradient-to-r from-violet-600/20 via-blue-500/10 to-transparent px-6 py-8">
					<p className="text-xs uppercase tracking-[0.25em] text-violet-200">Billing & Credits</p>
					<div className="mt-3 flex flex-wrap items-center justify-between gap-4">
						<div>
							<h1 className="text-3xl font-semibold">Plan overview</h1>
							<p className="text-sm text-zinc-200/80">
								You’re on the {planMeta.name} plan. Stay on top of credits, invoices, and upgrades.
							</p>
						</div>
						<button
							type="button"
							onClick={handlePortal}
							disabled={portalLoading}
							className="inline-flex items-center justify-center rounded-xl bg-white/90 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-white disabled:opacity-60"
						>
							{portalLoading ? 'Opening…' : 'Open Stripe Portal'}
						</button>
					</div>
					<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm text-zinc-200/90">
						<div>
							<p className="text-xs text-zinc-300 uppercase tracking-widest">Plan</p>
							<p className="text-lg font-semibold capitalize">{code}</p>
						</div>
						<div>
							<p className="text-xs text-zinc-300 uppercase tracking-widest">Monthly credits</p>
							<p className="text-lg font-semibold">
								{planMeta.credits === null ? 'Unlimited' : planMeta.credits}
							</p>
						</div>
						<div>
							<p className="text-xs text-zinc-300 uppercase tracking-widest">Watermarking</p>
							<p className="text-lg font-semibold">{features.watermarking ? 'On' : 'Off'}</p>
						</div>
						<div>
							<p className="text-xs text-zinc-300 uppercase tracking-widest">Current credits</p>
							<p className="text-lg font-semibold">{balance ?? '—'}</p>
						</div>
					</div>
				</section>

				<LowCreditBanner threshold={autoTopupSettingsData?.threshold ?? 10} />

				{showSuccessToast && (
					<div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
						✓ Credits purchased successfully! Your balance has been updated.
					</div>
				)}

				{(error || actionError) && (
					<div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
						{actionError ?? error}
					</div>
				)}

				{topupOptions.length > 0 && (
					<section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6 space-y-4">
						<h3 className="text-lg font-semibold">Buy Credits</h3>
						{topupLoading ? (
							<p className="text-sm text-zinc-500">Loading options…</p>
						) : topupError ? (
							<p className="text-sm text-red-400">{topupError}</p>
						) : (
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
								{topupOptions.map((option) => {
									const price = (option.unitAmount / 100).toFixed(2);
									const currency = option.currency.toUpperCase();
									return (
										<div
											key={option.priceId}
											className="rounded-xl border border-white/10 bg-zinc-900/80 p-4 space-y-3"
										>
											<div>
												<p className="text-sm font-semibold text-white">{option.label}</p>
												<p className="text-xs text-zinc-400 mt-1">
													{currency} {price}
												</p>
											</div>
											<button
												type="button"
												onClick={() => handleTopup(option.priceId)}
												className="w-full rounded-lg bg-white/90 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-white disabled:opacity-60"
											>
												Buy
											</button>
										</div>
									);
								})}
							</div>
						)}
					</section>
				)}

				<section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6 space-y-4">
					<h3 className="text-lg font-semibold">Marketing Preferences</h3>
					{meLoading ? (
						<p className="text-sm text-zinc-500">Loading preferences…</p>
					) : meError ? (
						<p className="text-sm text-red-400">{meError}</p>
					) : (
						<div className="space-y-4">
							<div className="flex items-center gap-3">
								<input
									type="checkbox"
									id="marketing-opt-in"
									checked={marketingOptIn}
									onChange={(e) => setMarketingOptIn(e.target.checked)}
									className="w-4 h-4 rounded border-white/20 bg-zinc-800 text-white focus:ring-2 focus:ring-violet-500"
								/>
								<label htmlFor="marketing-opt-in" className="text-sm text-white cursor-pointer">
									Send me product updates and tips (marketing emails)
								</label>
							</div>
							<p className="text-xs text-zinc-500">
								Enabling this lets us send occasional product updates. You can opt out anytime.
							</p>
							<div className="flex items-center gap-3">
								<button
									type="button"
									onClick={handleMarketingSave}
									disabled={marketingSaving}
									className="inline-flex items-center justify-center rounded-lg bg-white/90 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-white disabled:opacity-60"
								>
									{marketingSaving ? 'Saving…' : 'Save'}
								</button>
								{marketingSuccess && (
									<span className="text-xs text-emerald-400">Preferences updated.</span>
								)}
							</div>
							{marketingOptInAt && (
								<p className="text-xs text-zinc-500">
									Opted in on {new Date(marketingOptInAt).toLocaleString()}
								</p>
							)}
						</div>
					)}
				</section>

				<section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6 space-y-4">
					<h3 className="text-lg font-semibold">Low-credit Alerts</h3>
					{autoTopupLoading ? (
						<p className="text-sm text-zinc-500">Loading settings…</p>
					) : autoTopupError ? (
						<p className="text-sm text-red-400">{autoTopupError}</p>
					) : autoTopupSettingsData ? (
						<div className="space-y-4">
							<div className="flex items-center gap-3">
								<input
									type="checkbox"
									id="low-credit-emails-enabled"
									checked={autoTopupSettings?.lowCreditEmailsEnabled ?? true}
									onChange={(e) => {
										if (autoTopupSettings) {
											setAutoTopupSettings({ ...autoTopupSettings, lowCreditEmailsEnabled: e.target.checked });
										}
									}}
									className="w-4 h-4 rounded border-white/20 bg-zinc-800 text-white focus:ring-2 focus:ring-violet-500"
								/>
								<label htmlFor="low-credit-emails-enabled" className="text-sm text-white cursor-pointer">
									Email me when balance drops below threshold
								</label>
							</div>
							<div>
								<label className="block text-sm text-zinc-400 mb-2">
									Alert Threshold (credits)
								</label>
								<input
									type="number"
									min="1"
									max="10000"
									value={autoTopupSettings?.threshold ?? 10}
									onChange={(e) => {
										if (autoTopupSettings) {
											const val = Math.max(1, Math.min(10000, Number.parseInt(e.target.value, 10) || 10));
											setAutoTopupSettings({ ...autoTopupSettings, threshold: val });
										}
									}}
									className="w-full rounded-lg border border-white/10 bg-zinc-800 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
								/>
								<p className="text-xs text-zinc-500 mt-1">
									We'll email you at most once per day when your balance falls below this value.
								</p>
							</div>
							<button
								type="button"
								onClick={handleAlertThresholdSave}
								disabled={alertThresholdSaving}
								className="inline-flex items-center justify-center rounded-lg bg-white/90 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-white disabled:opacity-60"
							>
								{alertThresholdSaving ? 'Saving…' : 'Save'}
							</button>
							<p className="text-xs text-zinc-500">
								Note: Low-credit alerts work independently of Auto Top-Up. Other transactional emails (receipts, payment failed, welcome) are unaffected.
							</p>
						</div>
					) : null}
				</section>

				<section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6 space-y-4">
					<h3 className="text-lg font-semibold">Auto Top-Up</h3>
					{autoTopupLoading ? (
						<p className="text-sm text-zinc-500">Loading settings…</p>
					) : autoTopupError ? (
						<p className="text-sm text-red-400">{autoTopupError}</p>
					) : autoTopupSettingsData ? (
						<div className="space-y-4">
									<div className="flex items-center gap-3">
										<input
											type="checkbox"
											id="auto-topup-enabled"
											checked={autoTopupSettings?.enabled ?? false}
											onChange={(e) => {
												if (autoTopupSettings) {
													setAutoTopupSettings({ ...autoTopupSettings, enabled: e.target.checked });
												}
											}}
											className="w-4 h-4 rounded border-white/20 bg-zinc-800 text-white focus:ring-2 focus:ring-violet-500"
										/>
										<label htmlFor="auto-topup-enabled" className="text-sm text-white cursor-pointer">
											Enable Auto Top-Up
										</label>
									</div>

									{autoTopupSettings?.enabled && (
										<>
											<div>
												<label className="block text-sm text-zinc-400 mb-2">Top-Up Option</label>
												<select
													value={autoTopupSettings.priceId || ''}
													onChange={(e) => {
														if (autoTopupSettings) {
															setAutoTopupSettings({
																...autoTopupSettings,
																priceId: e.target.value || null
															});
														}
													}}
													className="w-full rounded-lg border border-white/10 bg-zinc-800 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
												>
													<option value="">Select an option…</option>
													{topupOptions.map((option) => (
														<option key={option.priceId} value={option.priceId}>
															{option.label}
														</option>
													))}
												</select>
											</div>

											<div>
												<label className="block text-sm text-zinc-400 mb-2">
													Threshold (credits)
												</label>
												<input
													type="number"
													min="1"
													max="10000"
													value={autoTopupSettings.threshold}
													onChange={(e) => {
														if (autoTopupSettings) {
															const val = Math.max(1, Math.min(10000, Number.parseInt(e.target.value, 10) || 10));
															setAutoTopupSettings({ ...autoTopupSettings, threshold: val });
														}
													}}
													className="w-full rounded-lg border border-white/10 bg-zinc-800 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
												/>
												<p className="text-xs text-zinc-500 mt-1">
													Auto top-up when balance drops below this amount (uses same threshold as Low-credit Alerts)
												</p>
											</div>

											<div className="flex items-center gap-3">
												<button
													type="button"
													onClick={handleAutoTopupSave}
													disabled={autoTopupSaving || !autoTopupSettings.priceId}
													className="inline-flex items-center justify-center rounded-lg bg-white/90 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-white disabled:opacity-60"
												>
													{autoTopupSaving ? 'Saving…' : 'Save'}
												</button>
												<a
													href="#"
													onClick={(e) => {
														e.preventDefault();
														void handlePortal();
													}}
													className="text-sm text-zinc-400 hover:text-white underline"
												>
													Add payment method in Stripe Portal
												</a>
											</div>

											{autoTopupSettings.enabled && autoTopupSettings.priceId && (
												<div className="rounded-lg border border-violet-500/20 bg-violet-500/10 p-3 text-sm text-violet-200">
													We'll auto-charge{' '}
													{topupOptions.find((o) => o.priceId === autoTopupSettings.priceId)?.label ||
														'selected option'}{' '}
													when balance &lt; {autoTopupSettings.threshold} credits.
												</div>
											)}
										</>
									)}
						</div>
					) : null}
				</section>

				<section className="grid gap-4 md:grid-cols-2">
					<div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6 space-y-4">
						<h3 className="text-sm text-zinc-400">Plan features</h3>
						{loading ? (
							<p className="text-sm text-zinc-500">Loading features…</p>
						) : (
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<FeatureCard label="API access" enabled={features.api_access} />
								<FeatureCard label="Watermarking" enabled={!features.watermarking} inverse />
							</div>
						)}
						<div className="flex flex-wrap gap-3">
							<button
								type="button"
								onClick={() => setHistoryOpen(true)}
								disabled={!userId}
								className="inline-flex items-center justify-center rounded-lg border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50"
							>
								View detailed credit history
							</button>
							<a
								href="/pricing"
								className="inline-flex items-center justify-center rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10"
							>
								View plans
							</a>
						</div>
					</div>
					<div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6 space-y-4">
						<h3 className="text-sm text-zinc-400">Credit overview</h3>
						<CreditBalance />
					</div>
				</section>

				<section>
					<InvoicesTable
						invoices={invoices}
						loading={invoicesLoading}
						hasMore={hasMore}
						onLoadMore={loadMore}
						error={invoicesError}
					/>
				</section>

				<section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6 space-y-4">
					<h3 className="text-lg font-semibold">Purchases</h3>
					{purchasesLoading ? (
						<p className="text-sm text-zinc-500">Loading purchases…</p>
					) : purchasesError ? (
						<p className="text-sm text-red-400">{purchasesError}</p>
					) : purchases.length === 0 ? (
						<p className="text-sm text-zinc-400">Top-ups you buy appear here.</p>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b border-white/10 text-left">
										<th className="pb-3 pr-4 text-zinc-400 font-medium">Date</th>
										<th className="pb-3 pr-4 text-zinc-400 font-medium">Type</th>
										<th className="pb-3 pr-4 text-zinc-400 font-medium">Credits</th>
										<th className="pb-3 pr-4 text-zinc-400 font-medium">Amount</th>
										<th className="pb-3 pr-4 text-zinc-400 font-medium">Receipt</th>
									</tr>
								</thead>
								<tbody>
									{purchases.map((purchase, idx) => {
										const date = new Date(purchase.at);
										const dateStr = date.toLocaleDateString();
										const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
										const amountStr = purchase.amountCents && purchase.currency
											? `${(purchase.amountCents / 100).toFixed(2)} ${purchase.currency.toUpperCase()}`
											: '—';
										return (
											<tr key={idx} className="border-b border-white/5">
												<td className="py-3 pr-4 text-zinc-300">
													<div>{dateStr}</div>
													<div className="text-xs text-zinc-500">{timeStr}</div>
												</td>
												<td className="py-3 pr-4 text-zinc-300">
													{purchase.kind === 'topup_auto' ? 'Auto' : 'Manual'}
												</td>
												<td className="py-3 pr-4 text-zinc-300">
													{purchase.credits !== null ? purchase.credits.toLocaleString() : '—'}
												</td>
												<td className="py-3 pr-4 text-zinc-300">{amountStr}</td>
												<td className="py-3 pr-4">
													{purchase.receiptUrl ? (
														<a
															href={purchase.receiptUrl}
															target="_blank"
															rel="noopener noreferrer"
															className="text-violet-400 hover:text-violet-300 underline"
														>
															View
														</a>
													) : (
														<span className="text-zinc-500">—</span>
													)}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</section>

				<section className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 space-y-4">
					<h3 className="text-lg font-semibold">Monthly credits by plan</h3>
					<div className="grid gap-4 md:grid-cols-2">
						{Object.entries(UI_PLANS).map(([planCode, plan]) => (
							<div
								key={planCode}
								className="rounded-xl border border-white/5 bg-zinc-900/80 p-4 text-sm text-zinc-300"
							>
								<div className="flex items-center justify-between mb-2">
									<span className="font-semibold capitalize">{planCode}</span>
									{plan.price === null ? (
										<span className="text-zinc-400">Custom</span>
									) : (
										<span className="text-zinc-400">${plan.price}/mo</span>
									)}
								</div>
								<p className="text-xs text-zinc-500 mb-2">
									{plan.credits === null ? 'Unlimited credits' : `${plan.credits} credits per month`}
								</p>
								<ul className="text-xs text-zinc-400 space-y-1">
									<li>API access: {plan.api ? 'Yes' : 'No'}</li>
									<li>Watermarking: {plan.watermark ? 'Yes' : 'No'}</li>
								</ul>
							</div>
						))}
					</div>
				</section>
			</div>
			{historyOpen && userId && (
				<CreditHistoryModal userId={userId} isOpen={historyOpen} onClose={() => setHistoryOpen(false)} />
			)}
		</div>
	);
}

function FeatureCard({
	label,
	enabled,
	inverse
}: {
	label: string;
	enabled: boolean;
	inverse?: boolean;
}) {
	const showCheck = inverse ? !enabled : enabled;
	return (
		<div className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-3">
			<span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${showCheck ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
				{showCheck ? <Check size={14} /> : <X size={14} />}
			</span>
			<div>
				<p className="text-sm font-medium text-white">{label}</p>
				<p className="text-xs text-zinc-400">
					{showCheck ? 'Included in your plan' : 'Not included'}
				</p>
			</div>
		</div>
	);
}


