import { appBaseUrl } from '../config/app';
import { makeUnsubToken } from '../services/unsubToken';

export async function marketingHeaders(userId: string): Promise<Record<string, string>> {
	const token = makeUnsubToken(userId);
	const appUrl = appBaseUrl();
	const unsubscribeUrl = `${appUrl}/api/email/unsubscribe?token=${encodeURIComponent(token)}`;
	return {
		'List-Unsubscribe': `<${unsubscribeUrl}>`,
		'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
	};
}


