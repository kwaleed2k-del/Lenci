/**
 * Email provider configuration - provider-agnostic transactional email.
 * Supports: console (dev), resend, mailersend.
 * Reads from env: EMAIL_PROVIDER, FROM_EMAIL, RESEND_API_KEY, MAILERSEND_API_KEY
 */

export interface EmailProvider {
	send(
		to: string,
		subject: string,
		html: string,
		text?: string,
		headers?: Record<string, string>
	): Promise<void>;
}

class ConsoleEmailProvider implements EmailProvider {
	async send(
		to: string,
		subject: string,
		html: string,
		text?: string,
		headers?: Record<string, string>
	): Promise<void> {
		console.info('[email]', {
			to,
			subject,
			text: text?.substring(0, 100),
			headers
		});
	}
}

class ResendEmailProvider implements EmailProvider {
	private apiKey: string;
	private fromEmail: string;

	constructor(apiKey: string, fromEmail: string) {
		this.apiKey = apiKey;
		this.fromEmail = fromEmail;
	}

	async send(
		to: string,
		subject: string,
		html: string,
		text?: string,
		headers?: Record<string, string>
	): Promise<void> {
		const response = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from: this.fromEmail,
				to,
				subject,
				html,
				text: text || undefined,
				headers: headers && Object.keys(headers).length ? headers : undefined
			})
		});

		if (!response.ok) {
			const body = await response.text();
			throw new Error(`Resend API error: ${response.status} ${body}`);
		}
	}
}

class MailerSendEmailProvider implements EmailProvider {
	private apiKey: string;
	private fromEmail: string;

	constructor(apiKey: string, fromEmail: string) {
		this.apiKey = apiKey;
		this.fromEmail = fromEmail;
	}

	async send(
		to: string,
		subject: string,
		html: string,
		text?: string,
		headers?: Record<string, string>
	): Promise<void> {
		const response = await fetch('https://api.mailersend.com/v1/email', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json',
				'X-Requested-With': 'XMLHttpRequest'
			},
			body: JSON.stringify({
				from: {
					email: this.fromEmail
				},
				to: [
					{
						email: to
					}
				],
				subject,
				html,
				text: text || undefined,
				headers: headers && Object.keys(headers).length ? headers : undefined
			})
		});

		if (!response.ok) {
			const body = await response.text();
			throw new Error(`MailerSend API error: ${response.status} ${body}`);
		}
	}
}

let _provider: EmailProvider | null = null;

export function getProvider(): EmailProvider {
	if (_provider) return _provider;

	const providerType = (process.env.EMAIL_PROVIDER || 'console').toLowerCase();
	const fromEmail = defaultFrom();

	if (providerType === 'resend') {
		const apiKey = process.env.RESEND_API_KEY;
		if (!apiKey) {
			console.warn('[email] RESEND_API_KEY not set, falling back to console');
			_provider = new ConsoleEmailProvider();
		} else {
			_provider = new ResendEmailProvider(apiKey, fromEmail);
		}
	} else if (providerType === 'mailersend') {
		const apiKey = process.env.MAILERSEND_API_KEY;
		if (!apiKey) {
			console.warn('[email] MAILERSEND_API_KEY not set, falling back to console');
			_provider = new ConsoleEmailProvider();
		} else {
			_provider = new MailerSendEmailProvider(apiKey, fromEmail);
		}
	} else {
		_provider = new ConsoleEmailProvider();
	}

	return _provider;
}

export function defaultFrom(): string {
	const from = process.env.FROM_EMAIL;
	if (!from || from.trim().length === 0) {
		throw new Error('FROM_EMAIL environment variable is required');
	}
	return from.trim();
}

