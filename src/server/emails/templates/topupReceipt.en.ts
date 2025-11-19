/**
 * Top-up receipt email template (English)
 */

export function subject(): string {
	return 'Credit Purchase Receipt';
}

export function html(vars: Record<string, string | number>): string {
	const displayName = String(vars.displayName || 'there');
	const credits = Number(vars.credits || 0);
	const amount = vars.amount ? String(vars.amount) : null;
	const currency = String(vars.currencyUpper || 'USD');
	const receiptUrl = vars.receiptUrl ? String(vars.receiptUrl) : null;
	const appUrl = String(vars.appUrl ?? 'https://lenci.ai');
	const billingUrl = String(vars.billingUrl ?? `${appUrl}/billing`);
	const kind = String(vars.kind || 'topup');
	const purchaseType = kind === 'topup_auto' ? 'Auto Top-Up' : 'Manual Purchase';

	return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Purchase Receipt</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
	<div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 20px;">
		<h1 style="color: #18181b; font-size: 28px; margin: 0 0 20px 0;">Purchase Receipt</h1>
		<p style="color: #525252; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
			Hi ${escapeHtml(displayName)},
		</p>
		<p style="color: #525252; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
			Thank you for your purchase! Your credits have been added to your account.
		</p>
		<div style="background-color: #f9fafb; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0;">
			<p style="color: #065f46; font-size: 14px; margin: 0 0 8px 0;"><strong>Purchase Type:</strong> ${escapeHtml(purchaseType)}</p>
			<p style="color: #065f46; font-size: 14px; margin: 0 0 8px 0;"><strong>Credits Purchased:</strong> ${credits.toLocaleString()}</p>
			${amount ? `<p style="color: #065f46; font-size: 14px; margin: 0;"><strong>Amount:</strong> ${currency} ${escapeHtml(amount)}</p>` : ''}
		</div>
		<div style="margin: 30px 0;">
			${receiptUrl ? `
			<a href="${escapeHtml(receiptUrl)}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; margin-right: 12px;">View Receipt</a>
			` : ''}
			<a href="${escapeHtml(billingUrl)}" style="display: inline-block; background-color: #18181b; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">Manage Billing</a>
		</div>
		<p style="color: #737373; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
			If you have any questions, please contact our support team.
		</p>
	</div>
</body>
</html>
	`.trim();
}

export function text(vars: Record<string, string | number>): string {
	const displayName = String(vars.displayName || 'there');
	const credits = Number(vars.credits || 0);
	const amount = vars.amount ? String(vars.amount) : null;
	const currency = String(vars.currencyUpper || 'USD');
	const receiptUrl = vars.receiptUrl ? String(vars.receiptUrl) : null;
	const appUrl = String(vars.appUrl ?? 'https://lenci.ai');
	const billingUrl = String(vars.billingUrl ?? `${appUrl}/billing`);
	const kind = String(vars.kind || 'topup');
	const purchaseType = kind === 'topup_auto' ? 'Auto Top-Up' : 'Manual Purchase';

	return `
Purchase Receipt

Hi ${displayName},

Thank you for your purchase! Your credits have been added to your account.

Purchase Type: ${purchaseType}
Credits Purchased: ${credits.toLocaleString()}
${amount ? `Amount: ${currency} ${amount}\n` : ''}

${receiptUrl ? `View Receipt: ${receiptUrl}\n` : ''}
Manage Billing: ${billingUrl}

If you have any questions, please contact our support team.
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

