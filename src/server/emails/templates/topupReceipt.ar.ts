/**
 * Top-up receipt email template (Arabic)
 */

export function subject(): string {
	return 'إيصال شراء الرصيد';
}

export function html(vars: Record<string, string | number>): string {
	const displayName = String(vars.displayName || 'هناك');
	const credits = Number(vars.credits || 0);
	const amount = vars.amount ? String(vars.amount) : null;
	const currency = String(vars.currencyUpper || 'USD');
	const receiptUrl = vars.receiptUrl ? String(vars.receiptUrl) : null;
	const appUrl = String(vars.appUrl ?? 'https://lenci.ai');
	const billingUrl = String(vars.billingUrl ?? `${appUrl}/billing`);
	const kind = String(vars.kind || 'topup');
	const purchaseType = kind === 'topup_auto' ? 'تعبئة تلقائية' : 'شراء يدوي';

	return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>إيصال الشراء</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
	<div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 20px;">
		<h1 style="color: #18181b; font-size: 28px; margin: 0 0 20px 0;">إيصال الشراء</h1>
		<p style="color: #525252; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
			مرحباً ${escapeHtml(displayName)}،
		</p>
		<p style="color: #525252; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
			شكراً لك على شرائك! تمت إضافة رصيدك إلى حسابك.
		</p>
		<div style="background-color: #f9fafb; border-right: 4px solid #10b981; padding: 16px; margin: 20px 0;">
			<p style="color: #065f46; font-size: 14px; margin: 0 0 8px 0;"><strong>نوع الشراء:</strong> ${escapeHtml(purchaseType)}</p>
			<p style="color: #065f46; font-size: 14px; margin: 0 0 8px 0;"><strong>الرصيد المشترى:</strong> ${credits.toLocaleString()}</p>
			${amount ? `<p style="color: #065f46; font-size: 14px; margin: 0;"><strong>المبلغ:</strong> ${escapeHtml(amount)} ${currency}</p>` : ''}
		</div>
		<div style="margin: 30px 0;">
			${receiptUrl ? `
			<a href="${escapeHtml(receiptUrl)}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; margin-left: 12px;">عرض الإيصال</a>
			` : ''}
			<a href="${escapeHtml(billingUrl)}" style="display: inline-block; background-color: #18181b; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">إدارة الفوترة</a>
		</div>
		<p style="color: #737373; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
			إذا كان لديك أي أسئلة، يرجى الاتصال بفريق الدعم لدينا.
		</p>
	</div>
</body>
</html>
	`.trim();
}

export function text(vars: Record<string, string | number>): string {
	const displayName = String(vars.displayName || 'هناك');
	const credits = Number(vars.credits || 0);
	const amount = vars.amount ? String(vars.amount) : null;
	const currency = String(vars.currencyUpper || 'USD');
	const receiptUrl = vars.receiptUrl ? String(vars.receiptUrl) : null;
	const appUrl = String(vars.appUrl ?? 'https://lenci.ai');
	const billingUrl = String(vars.billingUrl ?? `${appUrl}/billing`);
	const kind = String(vars.kind || 'topup');
	const purchaseType = kind === 'topup_auto' ? 'تعبئة تلقائية' : 'شراء يدوي';

	return `
إيصال الشراء

مرحباً ${displayName}،

شكراً لك على شرائك! تمت إضافة رصيدك إلى حسابك.

نوع الشراء: ${purchaseType}
الرصيد المشترى: ${credits.toLocaleString()}
${amount ? `المبلغ: ${amount} ${currency}\n` : ''}

${receiptUrl ? `عرض الإيصال: ${receiptUrl}\n` : ''}
إدارة الفوترة: ${billingUrl}

إذا كان لديك أي أسئلة، يرجى الاتصال بفريق الدعم لدينا.
	`.trim();
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

