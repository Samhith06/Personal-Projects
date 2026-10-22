import { NextResponse } from 'next/server';
import { huntOverlayState } from '@/server/services/hunt-overlay';
import { overlayState } from '@/server/services/overlay';

/** Polled by the OBS overlays every couple of seconds. The token in the URL is the only key. */
export async function GET(_req: Request, { params }: { params: Promise<{ kind: string; token: string }> }) {
  const { kind, token } = await params;
  const state = kind === 'hunt' ? await huntOverlayState(token) : await overlayState(kind, token);
  if (!state) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(state, { headers: { 'Cache-Control': 'no-store' } });
}
