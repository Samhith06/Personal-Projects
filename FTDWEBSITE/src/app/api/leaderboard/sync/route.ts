import { NextResponse, type NextRequest } from 'next/server';
import { getLastSyncResult, syncLeaderboards } from '@/server/services/leaderboard-sync';

/**
 * Leaderboard sync.
 *
 * The long-running server already pulls both Stake boards every five minutes (see
 * `src/instrumentation.ts`). This route is the manual escape hatch: a POST
 * forces a pull straight away, and it is also what an external scheduler would
 * call if the site ever moves to serverless hosting.
 *
 * Set `LEADERBOARD_SYNC_TOKEN` to require `Authorization: Bearer <token>`.
 */
export const dynamic = 'force-dynamic';

/** Read-only: when the standings were last refreshed. */
export async function GET() {
  return NextResponse.json(getLastSyncResult() ?? { ok: false, skipped: 'no sync has run yet' });
}

export async function POST(request: NextRequest) {
  const token = process.env.LEADERBOARD_SYNC_TOKEN?.trim();
  if (token && request.headers.get('authorization') !== `Bearer ${token}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const results = await syncLeaderboards();
  const ok = Object.values(results).some((result) => result.ok);
  return NextResponse.json(results, { status: ok ? 200 : 502 });
}
