/**
 * Returns the canonical base URL for user-facing links.
 * Default is https://lenci.ai, override with APP_BASE_URL=<https://...>.
 * Validates that the value starts with http/https.
 */
export function appBaseUrl(): string {
	const v = process.env.APP_BASE_URL?.trim();
	if (v && /^https?:\/\//i.test(v)) return v;
	return 'https://lenci.ai';
}

