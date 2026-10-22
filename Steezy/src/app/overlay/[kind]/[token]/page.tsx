import { notFound } from 'next/navigation';
import { DrawOverlay } from '@/components/overlay/DrawOverlay';
import { HuntOverlay } from '@/components/overlay/HuntOverlay';
import { huntOverlayState } from '@/server/services/hunt-overlay';
import { overlayState } from '@/server/services/overlay';

export default async function OverlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string; token: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { kind, token } = await params;
  const preview = (await searchParams).preview === '1';

  if (kind === 'hunt') {
    const state = await huntOverlayState(token);
    if (!state) notFound();
    return <HuntOverlay token={token} initial={state} preview={preview} />;
  }

  const state = await overlayState(kind, token);
  if (!state) notFound();
  return <DrawOverlay kind={kind} token={token} initial={state} preview={preview} />;
}
