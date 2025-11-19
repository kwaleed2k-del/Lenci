/**
 * Welcome email template (English)
 */

export function subject(): string {
	return 'Welcome to Siyada Studio!';
}

export function html(vars: Record<string, string | number>): string {
	const displayName = String(vars.displayName || 'there');
	const appUrl = String(vars.appUrl ?? 'https://lenci.ai');
	return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Welcome</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
	<div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 20px;">
		<h1 style="color: #18181b; font-size: 28px; margin: 0 0 20px 0;">Welcome, ${escapeHtml(displayName)}!</h1>
		<p style="color: #525252; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
			Thank you for joining Siyada Studio. We're excited to help you create stunning AI-generated content.
		</p>
		<p style="color: #525252; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
			Get started by exploring our features and creating your first generation.
		</p>
		<div style="margin: 30px 0;">
			<a href="${escapeHtml(appUrl)}" style="display: inline-block; background-color: #18181b; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">Get Started</a>
		</div>
		<p style="color: #737373; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
			If you have any questions, feel free to reach out to our support team.
		</p>
	</div>
</body>
</html>
	`.trim();
}

export function text(vars: Record<string, string | number>): string {
	const displayName = String(vars.displayName || 'there');
	const appUrl = String(vars.appUrl ?? 'https://lenci.ai');
	return `
Welcome, ${displayName}!

Thank you for joining Siyada Studio. We're excited to help you create stunning AI-generated content.

Get started by exploring our features and creating your first generation.

Visit: ${appUrl}

If you have any questions, feel free to reach out to our support team.
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

