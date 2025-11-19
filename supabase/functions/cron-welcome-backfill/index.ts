import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

(globalThis as any).process ??= { env: Deno.env.toObject() };

import { admin } from '../../../src/server/supabaseAdmin.ts';
import { sendWelcome } from '../../../src/server/services/emailService.ts';

const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';

type UserRecord = { id: string };

function respond(body: Record<string, unknown>, status = 200): Response {
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
		return respond({ ok: false, error: 'method_not_allowed' }, 405);
	}

	const secret = req.headers.get('x-cron-secret');
	if (!CRON_SECRET || secret !== CRON_SECRET) {
		return respond({ ok: false, error: 'unauthorized' }, 401);
	}

	try {
		const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
		const { data: recentUsers, error: usersError } = await admin
			.from('users')
			.select('id')
			.gte('created_at', sinceIso);

		if (usersError) throw new Error(usersError.message);

		const allUsers = (recentUsers ?? []).filter((u): u is UserRecord => typeof u?.id === 'string');
		if (allUsers.length === 0) {
			return respond({ ok: true, summary: { considered: 0, pending: 0, attempted: 0, sent: 0, skipped_duplicates: 0 } });
		}

		const userIds = allUsers.map((u) => u.id);
		const { data: existingEvents, error: eventsError } = await admin
			.from('email_events')
			.select('user_id')
			.in('user_id', userIds)
			.eq('type', 'welcome');

		if (eventsError) throw new Error(eventsError.message);

		const alreadySent = new Set((existingEvents ?? []).map((row) => row.user_id as string));
		const pending = userIds.filter((id) => !alreadySent.has(id));
		const alreadyHad = alreadySent.size;

		let sent = 0;
		let skippedDuplicates = 0;

		for (const userId of pending) {
			try {
				const status = await sendWelcome(userId);
				if (status === 'sent') {
					sent += 1;
				} else {
					skippedDuplicates += 1;
				}
			} catch (error) {
				const message = String((error as Error)?.message ?? error);
				if (message.includes('email_once_welcome_idx') || message.includes('duplicate key')) {
					skippedDuplicates += 1;
					continue;
				}
				console.error('[cron-welcome-backfill] failed to send welcome', { userId, error });
			}
		}

		return respond({
			ok: true,
			summary: {
				considered: allUsers.length,
				pending: pending.length,
				attempted: pending.length,
				sent,
				skipped_duplicates: skippedDuplicates,
				already_had: alreadyHad
			}
		});
	} catch (error) {
		console.error('[cron-welcome-backfill] unexpected error', error);
		return respond({ ok: false, error: 'internal_error' }, 500);
	}
});


