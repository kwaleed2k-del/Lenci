/**
 * Email service - transactional emails with idempotency.
 * Server-only; requires SUPABASE_SERVICE_ROLE_KEY.
 */

import { admin } from '../supabaseAdmin';
import { getProvider } from '../config/email';
import { appBaseUrl } from '../config/app';
import { getSettings as getAutoTopupSettings } from './autoTopupService';
import { getConsent } from './marketingConsent';
import * as welcomeEn from '../emails/templates/welcome.en';
import * as welcomeAr from '../emails/templates/welcome.ar';
import * as lowCreditEn from '../emails/templates/lowCredit.en';
import * as lowCreditAr from '../emails/templates/lowCredit.ar';
import * as paymentFailedEn from '../emails/templates/paymentFailed.en';
import * as paymentFailedAr from '../emails/templates/paymentFailed.ar';
import * as topupReceiptEn from '../emails/templates/topupReceipt.en';
import * as topupReceiptAr from '../emails/templates/topupReceipt.ar';

type EmailType = 'welcome' | 'low_credit' | 'payment_failed';
type Language = 'en' | 'ar';

interface UserRecord {
	id: string;
	email: string | null;
	locale?: string | null;
	display_name?: string | null;
}

/**
 * Get user locale, defaulting to 'en'
 */
async function getUserLocale(userId: string): Promise<Language> {
	const { data, error } = await admin
		.from('users')
		.select('locale')
		.eq('id', userId)
		.single();

	if (error || !data) return 'en';
	const locale = String(data.locale || 'en').toLowerCase();
	return locale === 'ar' ? 'ar' : 'en';
}

/**
 * Get user email and display name
 */
async function getUserInfo(userId: string): Promise<{ email: string; displayName: string }> {
	const { data, error } = await admin
		.from('users')
		.select('email, display_name')
		.eq('id', userId)
		.single();

	if (error || !data) {
		throw new Error(`User not found: ${userId}`);
	}

	const email = data.email;
	if (!email || typeof email !== 'string') {
		throw new Error(`User ${userId} has no email`);
	}

	return {
		email,
		displayName: (data.display_name as string | null) || email.split('@')[0]
	};
}

async function getUserPlanCode(userId: string): Promise<string> {
	const { data } = await admin
		.from('subscriptions')
		.select('plan_code')
		.eq('user_id', userId)
		.in('status', ['active', 'trialing', 'past_due'])
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();
	return (data?.plan_code as string | null) || 'Free';
}

/**
 * Send email with idempotency check
 */
async function sendEmailWithIdempotency(
	userId: string,
	type: EmailType,
	language: Language,
	payload: Record<string, unknown>,
	subjectFn: () => string,
	htmlFn: (vars: Record<string, string | number>) => string,
	textFn: (vars: Record<string, string | number>) => string,
	vars: Record<string, string | number>
): Promise<'sent' | 'already' | 'skipped'> {
	const provider = getProvider();
	const userInfo = await getUserInfo(userId);

	try {
		// Attempt to insert email event (idempotency check)
		const { error: insertError } = await admin.from('email_events').insert({
			user_id: userId,
			type,
			language,
			payload
		});

		if (insertError) {
			// Check if it's a unique constraint violation (already sent)
			if (
				insertError.message?.includes('email_once_welcome_idx') ||
				insertError.message?.includes('email_daily_low_credit_idx') ||
				insertError.message?.includes('email_unique_payment_failed_idx') ||
				insertError.code === '23505' // PostgreSQL unique violation
			) {
				return 'already';
			}
			throw insertError;
		}

		// Send email (best-effort, don't fail the request if this fails)
		try {
			const subject = subjectFn();
			const html = htmlFn(vars);
			const text = textFn(vars);
			await provider.send(userInfo.email, subject, html, text);
		} catch (emailError) {
			console.error(`[email] Failed to send ${type} email to ${userId}:`, emailError);
			// Log the error but don't throw - email was logged, that's what matters
		}

		return 'sent';
	} catch (error) {
		console.error(`[email] Error processing ${type} email for ${userId}:`, error);
		// Re-throw unexpected errors
		throw error;
	}
}

/**
 * Send welcome email (once per user)
 * 
 * TODO: Call this from Supabase Edge Function `user.created` trigger:
 *   - Create Edge Function at supabase/functions/user-created/index.ts
 *   - Trigger on auth.users INSERT
 *   - Call: await sendWelcome(user.id)
 */
export async function sendWelcome(userId: string): Promise<'sent' | 'already'> {
	const language = await getUserLocale(userId);
	const userInfo = await getUserInfo(userId);

	const template = language === 'ar' ? welcomeAr : welcomeEn;
	const appUrl = appBaseUrl();
	const vars = {
		displayName: userInfo.displayName,
		appUrl
	};

	const result = await sendEmailWithIdempotency(
		userId,
		'welcome',
		language,
		{},
		template.subject,
		template.html,
		template.text,
		vars
	);

	return result === 'skipped' ? 'already' : result;
}

/**
 * Maybe notify low credit (once per day per user, only if balance < threshold)
 */
export async function maybeNotifyLowCredit(
	userId: string,
	balance: number,
	threshold = 10
): Promise<'sent' | 'skipped'> {
	if (balance >= threshold) {
		return 'skipped';
	}

	const language = await getUserLocale(userId);
	const userInfo = await getUserInfo(userId);

	// Get plan info
	const plan = await getUserPlanCode(userId);

	const template = language === 'ar' ? lowCreditAr : lowCreditEn;
	const appUrl = appBaseUrl();
	const vars = {
		balance,
		plan,
		appUrl,
		billingUrl: `${appUrl}/billing`
	};

	const result = await sendEmailWithIdempotency(
		userId,
		'low_credit',
		language,
		{ balance, threshold },
		template.subject,
		template.html,
		template.text,
		vars
	);

	return result;
}

/**
 * Send payment failed email (once per Stripe invoice)
 */
export async function sendPaymentFailed(
	userId: string,
	stripeObjectId: string,
	amountDueCents: number
): Promise<'sent' | 'already'> {
	const language = await getUserLocale(userId);

	// Get invoice number from Stripe if possible (optional enhancement)
	const invoiceNumber = stripeObjectId; // Could fetch from Stripe API if needed

	const template = language === 'ar' ? paymentFailedAr : paymentFailedEn;
	const appUrl = appBaseUrl();
	const vars = {
		amount_due: amountDueCents,
		invoice_number: invoiceNumber,
		appUrl,
		billingUrl: `${appUrl}/billing`
	};

	const result = await sendEmailWithIdempotency(
		userId,
		'payment_failed',
		language,
		{ stripe_object_id: stripeObjectId, amount_due_cents: amountDueCents },
		template.subject,
		template.html,
		template.text,
		vars
	);

	return result === 'skipped' ? 'already' : result;
}

/**
 * Send top-up receipt email (once per Stripe object)
 */
export async function sendTopupReceipt(args: {
	userId: string;
	stripeObjectId: string;
	amountCents: number | null;
	currency: string | null;
	credits: number;
	receiptUrl: string | null;
	kind: 'topup' | 'topup_auto';
}): Promise<void> {
	const language = await getUserLocale(args.userId);
	const userInfo = await getUserInfo(args.userId);
	const appUrl = appBaseUrl();
	const billingUrl = `${appUrl}/billing`;

	const amount = args.amountCents ? (args.amountCents / 100).toFixed(2) : null;
	const currencyUpper = (args.currency ?? '').toUpperCase() || 'USD';

	// Insert into email_events first (idempotency check)
	const { error } = await admin.from('email_events').insert({
		user_id: args.userId,
		type: 'topup_receipt',
		language,
		payload: {
			stripe_object_id: args.stripeObjectId,
			kind: args.kind,
			credits: args.credits,
			amount_cents: args.amountCents,
			currency: args.currency,
			receipt_url: args.receiptUrl
		}
	});

	if (error) {
		// Check if it's a unique constraint violation (already sent)
		if (
			error.message?.includes('email_unique_topup_receipt_idx') ||
			error.message?.includes('duplicate key') ||
			error.code === '23505'
		) {
			// Already sent, skip
			return;
		}
		throw new Error(error.message);
	}

	// Send email (best-effort, don't fail if this fails)
	try {
		const template = language === 'ar' ? topupReceiptAr : topupReceiptEn;
		const vars = {
			displayName: userInfo.displayName,
			credits: args.credits,
			amount: amount,
			currencyUpper,
			receiptUrl: args.receiptUrl,
			appUrl,
			billingUrl,
			kind: args.kind
		};

		const subject = template.subject();
		const html = template.html(vars);
		const text = template.text(vars);
		const provider = getProvider();
		await provider.send(userInfo.email, subject, html, text);
	} catch (emailError) {
		console.error(`[email] Failed to send topup receipt email to ${args.userId}:`, emailError);
		// Log the error but don't throw - email was logged, that's what matters
	}
}

export type EmailPreviewKind = 'welcome' | 'low_credit' | 'payment_failed' | 'topup_receipt';

export interface EmailPreviewOptions {
	kind: EmailPreviewKind;
	userId?: string;
	balance?: number;
	plan?: string;
	amountCents?: number | null;
	currency?: string | null;
	credits?: number | null;
	receiptUrl?: string | null;
	invoiceNumber?: string | null;
	receiptKind?: 'topup' | 'topup_auto';
}

export async function renderEmailPreview(
	options: EmailPreviewOptions
): Promise<{ subject: string; html: string; text: string }> {
	const appUrl = appBaseUrl();
	const billingUrl = `${appUrl}/billing`;

	let language: Language = 'en';
	let displayName = 'there';

	if (options.userId) {
		language = await getUserLocale(options.userId);
		const userInfo = await getUserInfo(options.userId);
		displayName = userInfo.displayName;
	}

	const ensureUser = () => {
		if (!options.userId) {
			throw new Error('user_required');
		}
	};

	switch (options.kind) {
		case 'welcome': {
			ensureUser();
			const template = language === 'ar' ? welcomeAr : welcomeEn;
			const vars = { displayName, appUrl };
			return {
				subject: template.subject(),
				html: template.html(vars),
				text: template.text(vars)
			};
		}
		case 'low_credit': {
			ensureUser();
			const plan = options.plan ?? (await getUserPlanCode(options.userId!));
			const balance = typeof options.balance === 'number' ? options.balance : 5;
			const template = language === 'ar' ? lowCreditAr : lowCreditEn;
			const vars = {
				balance,
				plan,
				appUrl,
				billingUrl
			};
			return {
				subject: template.subject(),
				html: template.html(vars),
				text: template.text(vars)
			};
		}
		case 'payment_failed': {
			const template = language === 'ar' ? paymentFailedAr : paymentFailedEn;
			const vars = {
				amount_due: typeof options.amountCents === 'number' ? options.amountCents : 0,
				invoice_number: options.invoiceNumber ?? 'N/A',
				appUrl,
				billingUrl
			};
			return {
				subject: template.subject(),
				html: template.html(vars),
				text: template.text(vars)
			};
		}
		case 'topup_receipt': {
			const template = language === 'ar' ? topupReceiptAr : topupReceiptEn;
			const amountDisplay =
				typeof options.amountCents === 'number' ? (options.amountCents / 100).toFixed(2) : '';
			const vars = {
				displayName,
				credits: options.credits ?? 0,
				amount: amountDisplay,
				currencyUpper: (options.currency ?? 'USD').toUpperCase(),
				receiptUrl: options.receiptUrl ?? '',
				appUrl,
				billingUrl,
				kind: options.receiptKind ?? 'topup'
			};
			return {
				subject: template.subject(),
				html: template.html(vars),
				text: template.text(vars)
			};
		}
		default:
			throw new Error('unsupported_kind');
	}
}

export async function canSendMarketing(userId: string, email: string): Promise<boolean> {
	const consent = await getConsent(userId);
	if (!consent.marketingOptIn) return false;
	const normalizedEmail = email.trim().toLowerCase();
	if (!normalizedEmail) return false;
	const { data, error } = await admin
		.from('email_suppressions')
		.select('id')
		.eq('email', normalizedEmail)
		.limit(1);
	if (error) {
		throw new Error(`Suppression check failed: ${error.message}`);
	}
	return !data || data.length === 0;
}

export const shouldSendMarketing = canSendMarketing;

