import { notFound } from 'next/navigation';
import { DrawOverlay } from '@/components/overlay/DrawOverlay';
import { overlayState } from '@/server/services/overlay';

/** Raffle and giveaway draw overlays. The bonus hunt and tournament have their own at /overlay/hunt and /overlay/tournament. */
export default async function OverlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string; token: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { kind, token } = await params;
  const preview = (await searchParams).preview === '1';
  const state = await overlayState(kind, token);
  if (!state) notFound();
  return <DrawOverlay kind={kind} token={token} initial={state} preview={preview} />;
}
