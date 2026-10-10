import { NextResponse, type NextRequest } from 'next/server';
import { getActiveHunt, getOverlayHunt } from '@/server/services/bonus-hunt';

export const dynamic = 'force-dynamic';

/**
 * The hunt currently on screen, or null when there isn't one.
 *
 * Polled by the board while a hunt is being opened, and by the stream overlays,
 * so the cache window is short — a payout that lands mid-stream is stale within
 * seconds, not minutes. `?channel=<id>` narrows it to one creator and keeps a
 * just-finished hunt around, which is what an overlay wants.
 */
export async function GET(request: NextRequest) {
  const channel = request.nextUrl.searchParams.get('channel');
  const hunt = channel ? await getOverlayHunt(channel) : await getActiveHunt();
  return NextResponse.json(hunt, {
    headers: { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10' },
  });
}
