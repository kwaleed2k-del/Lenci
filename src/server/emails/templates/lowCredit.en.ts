/**
 * Low credit email template (English)
 */

export function subject(): string {
	return 'Your credit balance is running low';
}

export function html(vars: Record<string, string | number>): string {
	const balance = Number(vars.balance || 0);
	const plan = String(vars.plan || 'Free');
	const appUrl = String(vars.appUrl ?? 'https://lenci.ai');
	const billingUrl = String(vars.billingUrl ?? `${appUrl}/billing`);
	return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Low Credit Balance</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
	<div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 20px;">
		<h1 style="color: #18181b; font-size: 28px; margin: 0 0 20px 0;">Credit Balance Running Low</h1>
		<p style="color: #525252; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
			Your current credit balance is <strong>${balance.toFixed(2)}</strong> credits.
		</p>
		<p style="color: #525252; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
			To continue generating content without interruption, consider upgrading your plan or purchasing additional credits.
		</p>
		<div style="margin: 30px 0;">
			<a href="${escapeHtml(billingUrl)}" style="display: inline-block; background-color: #18181b; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">Manage Billing</a>
		</div>
		<p style="color: #737373; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
			Current plan: ${escapeHtml(plan)}
		</p>
		<p style="color: #737373; font-size: 12px; line-height: 1.6; margin: 20px 0 0 0; border-top: 1px solid #e5e5e5; padding-top: 20px;">
			<a href="${escapeHtml(billingUrl)}" style="color: #737373; text-decoration: underline;">Manage email preferences</a>
		</p>
	</div>
</body>
</html>
	`.trim();
}

export function text(vars: Record<string, string | number>): string {
	const balance = Number(vars.balance || 0);
	const plan = String(vars.plan || 'Free');
	const appUrl = String(vars.appUrl ?? 'https://lenci.ai');
	const billingUrl = String(vars.billingUrl ?? `${appUrl}/billing`);
	return `
Credit Balance Running Low

Your current credit balance is ${balance.toFixed(2)} credits.

To continue generating content without interruption, consider upgrading your plan or purchasing additional credits.

Manage billing: ${billingUrl}

Current plan: ${plan}

Manage email preferences: ${billingUrl}
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

