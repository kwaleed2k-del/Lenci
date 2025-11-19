export function subject(): string {
	return 'Lenci Studio · Latest product updates';
}

export function html(vars: Record<string, string | number>): string {
	const appUrl = String(vars.appUrl ?? 'https://lenci.ai');
	const billingUrl = String(vars.billingUrl ?? `${appUrl}/billing`);
	const unsubUrl = String(vars.unsubUrl ?? `${billingUrl}?section=marketing`);
	return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Lenci Studio Newsletter</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f9fafb;">
	<div style="max-width:600px;margin:0 auto;background-color:#ffffff;padding:32px;">
		<h1 style="font-size:26px;color:#18181b;margin:0 0 16px;">Lenci Studio updates</h1>
		<p style="font-size:16px;line-height:1.6;color:#374151;margin:0 0 16px;">
			This is a placeholder marketing template. Replace this section with real announcements when campaigns are ready.
		</p>
		<p style="font-size:16px;line-height:1.6;color:#374151;margin:0 0 16px;">
			Stay tuned for new features, best practices, and ideas on getting more from your credits.
		</p>
		<div style="margin:24px 0;">
			<a href="${escapeHtml(appUrl)}" style="display:inline-block;background-color:#7c3aed;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;">Visit Lenci Studio</a>
		</div>
		<hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;">
		<p style="font-size:12px;color:#6b7280;margin:0;">
			You are receiving this because you opted in to product updates.
			<a href="${escapeHtml(unsubUrl)}" style="color:#4f46e5;text-decoration:underline;">Unsubscribe instantly</a>
			or manage preferences at
			<a href="${escapeHtml(billingUrl)}" style="color:#4f46e5;text-decoration:underline;">${escapeHtml(billingUrl)}</a>.
		</p>
	</div>
</body>
</html>
	`.trim();
}

export function text(vars: Record<string, string | number>): string {
	const appUrl = String(vars.appUrl ?? 'https://lenci.ai');
	const billingUrl = String(vars.billingUrl ?? `${appUrl}/billing`);
	const unsubUrl = String(vars.unsubUrl ?? `${billingUrl}?section=marketing`);
	return `
Lenci Studio updates

This is a placeholder marketing template. Replace with real announcements when campaigns are ready.

Visit: ${appUrl}

You received this because you opted in to updates.
Unsubscribe: ${unsubUrl}
Manage preferences: ${billingUrl}
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


