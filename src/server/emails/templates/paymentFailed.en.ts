/**
 * Payment failed email template (English)
 */

export function subject(): string {
	return 'Payment failed for your subscription';
}

export function html(vars: Record<string, string | number>): string {
	const amountDue = Number(vars.amount_due || 0) / 100; // Convert cents to dollars
	const invoiceNumber = String(vars.invoice_number || 'N/A');
	const appUrl = String(vars.appUrl ?? 'https://lenci.ai');
	const billingUrl = String(vars.billingUrl ?? `${appUrl}/billing`);
	return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Payment Failed</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
	<div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 20px;">
		<h1 style="color: #dc2626; font-size: 28px; margin: 0 0 20px 0;">Payment Failed</h1>
		<p style="color: #525252; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
			We were unable to process the payment for your subscription.
		</p>
		<div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0;">
			<p style="color: #991b1b; font-size: 14px; margin: 0 0 8px 0;"><strong>Invoice:</strong> ${escapeHtml(invoiceNumber)}</p>
			<p style="color: #991b1b; font-size: 14px; margin: 0;"><strong>Amount Due:</strong> $${amountDue.toFixed(2)}</p>
		</div>
		<p style="color: #525252; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
			Please update your payment method to avoid service interruption. Your subscription will remain active for a grace period.
		</p>
		<div style="margin: 30px 0;">
			<a href="${escapeHtml(billingUrl)}" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">Update Payment Method</a>
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
	const amountDue = Number(vars.amount_due || 0) / 100;
	const invoiceNumber = String(vars.invoice_number || 'N/A');
	const appUrl = String(vars.appUrl ?? 'https://lenci.ai');
	const billingUrl = String(vars.billingUrl ?? `${appUrl}/billing`);
	return `
Payment Failed

We were unable to process the payment for your subscription.

Invoice: ${invoiceNumber}
Amount Due: $${amountDue.toFixed(2)}

Please update your payment method to avoid service interruption. Your subscription will remain active for a grace period.

Update payment method: ${billingUrl}

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

