const HEADER_NAME = 'x-admin-token';

export function validateAdminToken(provided: string | null): boolean {
	const expected = process.env.INTERNAL_ADMIN_TOKEN;
	return Boolean(expected && provided && provided === expected);
}

export function adminHeaderName() {
	return HEADER_NAME;
}


