import { createHmac, timingSafeEqual as nodeTimingSafeEqual } from 'node:crypto';

const SECRET = process.env.EMAIL_UNSUB_SECRET;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function assertSecret(): string {
	if (!SECRET || SECRET.length < 16) {
		throw new Error('EMAIL_UNSUB_SECRET must be set and at least 16 characters');
	}
	return SECRET;
}

type TokenPayload = {
	uid: string;
	ts: number;
	sig: string;
};

function base64UrlEncode(input: string): string {
	return Buffer.from(input)
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

function base64UrlDecode(input: string): string {
	const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
	const normalized = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
	return Buffer.from(normalized, 'base64').toString('utf8');
}

function sign(data: string): string {
	const secret = assertSecret();
	return createHmac('sha256', secret).update(data).digest('base64url');
}

export function makeUnsubToken(userId: string): string {
	const ts = Date.now();
	const signingInput = `${userId}.${ts}`;
	const payload: TokenPayload = {
		uid: userId,
		ts,
		sig: sign(signingInput)
	};
	return base64UrlEncode(JSON.stringify(payload));
}

export function parseUnsubToken(token: string): { userId: string } {
	if (!token || typeof token !== 'string') {
		throw new Error('invalid_token');
	}
	let decoded: TokenPayload;
	try {
		decoded = JSON.parse(base64UrlDecode(token)) as TokenPayload;
	} catch {
		throw new Error('invalid_token');
}

	if (!decoded?.uid || typeof decoded.ts !== 'number' || typeof decoded.sig !== 'string') {
		throw new Error('invalid_token');
	}

	if (Date.now() - Number(decoded.ts) > ONE_YEAR_MS) {
		throw new Error('token_expired');
	}

	const signingInput = `${decoded.uid}.${decoded.ts}`;
	const expected = sign(signingInput);
	if (!timingSafeEqual(expected, decoded.sig)) {
		throw new Error('invalid_token');
	}

	return { userId: decoded.uid };
}

function timingSafeEqual(expected: string, actual: string): boolean {
	const expectedBuf = Buffer.from(expected);
	const actualBuf = Buffer.from(actual);
	if (expectedBuf.length !== actualBuf.length) return false;
	return nodeTimingSafeEqual(expectedBuf, actualBuf);
}


