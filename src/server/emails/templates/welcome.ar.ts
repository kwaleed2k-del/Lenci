/**
 * Welcome email template (Arabic)
 */

export function subject(): string {
	return 'مرحباً بك في استوديو سيادة!';
}

export function html(vars: Record<string, string | number>): string {
	const displayName = String(vars.displayName || 'هناك');
	const appUrl = String(vars.appUrl ?? 'https://lenci.ai');
	return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>مرحباً</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
	<div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px 20px;">
		<h1 style="color: #18181b; font-size: 28px; margin: 0 0 20px 0;">مرحباً، ${escapeHtml(displayName)}!</h1>
		<p style="color: #525252; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
			شكراً لك على الانضمام إلى استوديو سيادة. نحن متحمسون لمساعدتك في إنشاء محتوى مذهل من خلال الذكاء الاصطناعي.
		</p>
		<p style="color: #525252; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
			ابدأ باستكشاف ميزاتنا وإنشاء أول إنشاء لك.
		</p>
		<div style="margin: 30px 0;">
			<a href="${escapeHtml(appUrl)}" style="display: inline-block; background-color: #18181b; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600;">ابدأ الآن</a>
		</div>
		<p style="color: #737373; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
			إذا كان لديك أي أسئلة، لا تتردد في التواصل مع فريق الدعم لدينا.
		</p>
	</div>
</body>
</html>
	`.trim();
}

export function text(vars: Record<string, string | number>): string {
	const displayName = String(vars.displayName || 'هناك');
	const appUrl = String(vars.appUrl ?? 'https://lenci.ai');
	return `
مرحباً، ${displayName}!

شكراً لك على الانضمام إلى استوديو سيادة. نحن متحمسون لمساعدتك في إنشاء محتوى مذهل من خلال الذكاء الاصطناعي.

ابدأ باستكشاف ميزاتنا وإنشاء أول إنشاء لك.

زيارة: ${appUrl}

إذا كان لديك أي أسئلة، لا تتردد في التواصل مع فريق الدعم لدينا.
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

