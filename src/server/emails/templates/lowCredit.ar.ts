/**
 * Low credit email template (Arabic)
 */

export function subject(): string {
	return 'رصيدك الائتماني منخفض';
}

export function html(vars: Record<string, string | number>): string {
	const balance = Number(vars.balance || 0);
	const plan = String(vars.plan || 'مجاني');
	const appUrl = String(vars.appUrl ?? 'https://lenci.ai');
	const billingUrl = String(vars.billingUrl ?? `${appUrl}/billing`);
	return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>رصيد ائتماني منخفض</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
	<div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 20px;">
		<h1 style="color: #18181b; font-size: 28px; margin: 0 0 20px 0;">رصيدك الائتماني منخفض</h1>
		<p style="color: #525252; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
			رصيدك الحالي هو <strong>${balance.toFixed(2)}</strong> رصيد.
		</p>
		<p style="color: #525252; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
			لمواصلة إنشاء المحتوى دون انقطاع، يُرجى التفكير في ترقية خطتك أو شراء رصيد إضافي.
		</p>
		<div style="margin: 30px 0;">
			<a href="${escapeHtml(billingUrl)}" style="display: inline-block; background-color: #18181b; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">إدارة الفوترة</a>
		</div>
		<p style="color: #737373; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
			الخطة الحالية: ${escapeHtml(plan)}
		</p>
		<p style="color: #737373; font-size: 12px; line-height: 1.6; margin: 20px 0 0 0; border-top: 1px solid #e5e5e5; padding-top: 20px;">
			<a href="${escapeHtml(billingUrl)}" style="color: #737373; text-decoration: underline;">إدارة تفضيلات البريد الإلكتروني</a>
		</p>
	</div>
</body>
</html>
	`.trim();
}

export function text(vars: Record<string, string | number>): string {
	const balance = Number(vars.balance || 0);
	const plan = String(vars.plan || 'مجاني');
	const appUrl = String(vars.appUrl ?? 'https://lenci.ai');
	const billingUrl = String(vars.billingUrl ?? `${appUrl}/billing`);
	return `
رصيدك الائتماني منخفض

رصيدك الحالي هو ${balance.toFixed(2)} رصيد.

لمواصلة إنشاء المحتوى دون انقطاع، يُرجى التفكير في ترقية خطتك أو شراء رصيد إضافي.

إدارة الفوترة: ${billingUrl}

الخطة الحالية: ${plan}

إدارة تفضيلات البريد الإلكتروني: ${billingUrl}
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

