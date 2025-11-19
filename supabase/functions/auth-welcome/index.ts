import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

// Edge functions run in Deno, but our shared email service expects Node's `process`.
// Provide a minimal shim so server-side utilities (Supabase admin client, config helpers)
// can reuse their existing environment-variable lookups without modification.
(globalThis as any).process ??= { env: Deno.env.toObject() };

/**
 * This function can be wired to Supabase Auth Webhooks (user.created)
 * or called by your app server immediately after signup. Send a POST
 * with `{ "user_id": "<uuid>" }` and header `x-hook-secret`.
 */
import { sendWelcome } from '../../../src/server/services/emailService.ts';

const HOOK_SECRET = Deno.env.get('HOOK_SECRET') ?? '';

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-store'
		}
	});
}

Deno.serve(async (req) => {
	if (req.method !== 'POST') {
		return jsonResponse({ ok: false, error: 'method_not_allowed' }, 405);
	}

	const secret = req.headers.get('x-hook-secret');
	if (!HOOK_SECRET || secret !== HOOK_SECRET) {
		return jsonResponse({ ok: false, error: 'unauthorized' }, 401);
	}

	try {
		const payload = await req.json();
		const userId = typeof payload?.user_id === 'string' && payload.user_id.length > 0 ? payload.user_id : null;

		if (!userId) {
			return jsonResponse({ ok: false, error: 'invalid_payload' }, 400);
		}

		const status = await sendWelcome(userId);
		return jsonResponse({ ok: true, status });
	} catch (error) {
		const message = String((error as Error)?.message ?? error);
		// Treat idempotency conflicts (already sent) as success to keep the hook simple.
		if (message.includes('email_once_welcome_idx') || message.includes('duplicate key')) {
			console.log('[auth-welcome] duplicate, already sent', message);
			return jsonResponse({ ok: true, status: 'duplicate' });
		}
		console.error('[auth-welcome] failed to send welcome', error);
		return jsonResponse({ ok: false, error: 'internal_error' }, 500);
	}
});


