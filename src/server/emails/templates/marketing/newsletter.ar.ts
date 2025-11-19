export function subject(): string {
	return 'تحديثات Lenci Studio';
}

export function html(vars: Record<string, string | number>): string {
	const appUrl = String(vars.appUrl ?? 'https://lenci.ai');
	const billingUrl = String(vars.billingUrl ?? `${appUrl}/billing`);
	const unsubUrl = String(vars.unsubUrl ?? `${billingUrl}?section=marketing`);
	return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>نشرة Lenci Studio</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f9fafb;">
	<div style="max-width:600px;margin:0 auto;background-color:#ffffff;padding:32px;">
		<h1 style="font-size:26px;color:#18181b;margin:0 0 16px;">آخر تحديثات Lenci Studio</h1>
		<p style="font-size:16px;line-height:1.6;color:#374151;margin:0 0 16px;">
			هذه رسالة تجريبية لمحتوى التسويق. استبدل هذا النص بالإعلانات الحقيقية عندما تكون الحملة جاهزة.
		</p>
		<p style="font-size:16px;line-height:1.6;color:#374151;margin:0 0 16px;">
			ترقب ميزات جديدة ونصائح للاستفادة القصوى من أرصدتك.
		</p>
		<div style="margin:24px 0;">
			<a href="${escapeHtml(appUrl)}" style="display:inline-block;background-color:#7c3aed;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;">زيارة Lenci Studio</a>
		</div>
		<hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;">
		<p style="font-size:12px;color:#6b7280;margin:0;">
			تلقيت هذه الرسالة لأنك وافقت على تلقي التحديثات.
			<a href="${escapeHtml(unsubUrl)}" style="color:#4f46e5;text-decoration:underline;">إلغاء الاشتراك فوراً</a>
			أو إدارة التفضيلات عبر
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
تحديثات Lenci Studio

هذه رسالة تسويقية تجريبية. سيتم استبدالها بالمحتوى الحقيقي عند إطلاق الحملات.

زيارة: ${appUrl}

استلمت هذه الرسالة لأنك وافقت على تلقي التحديثات.
إلغاء الاشتراك: ${unsubUrl}
إدارة التفضيلات: ${billingUrl}
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


