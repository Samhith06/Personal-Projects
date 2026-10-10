import { NextResponse } from 'next/server';
import { getLiveStatus } from '@/server/services/live';

export const dynamic = 'force-dynamic';

/** Public live status for all creators. Cached server-side (see live service). */
export async function GET() {
  const live = await getLiveStatus();
  return NextResponse.json(live, {
    headers: {
      // Let a CDN absorb polling traffic; the service refreshes every ~45s.
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
    },
  });
}
