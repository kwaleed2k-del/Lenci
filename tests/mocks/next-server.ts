export class _NextResponse {
	static json(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
		return {
			status: init?.status ?? 200,
			body,
			headers: init?.headers ?? {}
		};
	}

	static redirect(url: string, init?: { status?: number; headers?: Record<string, string> }) {
		return {
			status: init?.status ?? 307,
			headers: {
				location: url,
				...(init?.headers ?? {})
			}
		};
	}
}

export const NextResponse = _NextResponse;
export type NextRequest = Request;


