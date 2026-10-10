import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { HuntOverlay, type OverlayView } from '@/components/bonus-hunt/HuntOverlay';
import { getOverlayHunt } from '@/server/services/bonus-hunt';
import { getStreamerMap } from '@/server/services/content';
import '@/styles/overlay.css';

export const metadata: Metadata = {
  title: 'Bonus hunt overlay',
  robots: { index: false, follow: false },
};

/*
 * The site declares a dark colour scheme, and a dark-scheme page shown inside a
 * light one gets an opaque backdrop painted behind it: a black box around the
 * overlay instead of the stream showing through. Overlays opt out, here (the
 * meta tag) and in overlay.css (the page's own `color-scheme`); either alone
 * still leaves the box.
 */
export const viewport: Viewport = { colorScheme: 'normal' };

export const dynamic = 'force-dynamic';

const VIEWS: OverlayView[] = ['board', 'bar', 'current'];

/**
 * A channel's bonus hunt as an OBS browser source.
 *
 *   /overlay/bonus-hunt/<channel>                the full board
 *   /overlay/bonus-hunt/<channel>?view=bar       one line of figures
 *   /overlay/bonus-hunt/<channel>?view=current   the bonus being opened
 *
 * `rows` sets how many bonuses the board shows at once (default 8).
 */
export default async function HuntOverlayPage({ params, searchParams }: PageProps<'/overlay/bonus-hunt/[channel]'>) {
  const [{ channel }, sp] = await Promise.all([params, searchParams]);
  const streamers = await getStreamerMap();
  if (!streamers.has(channel)) notFound();

  const view = VIEWS.find((v) => v === sp.view) ?? 'board';
  const rows = Math.min(20, Math.max(3, Number(sp.rows) || 8));
  const hunt = await getOverlayHunt(channel);

  return <HuntOverlay initial={hunt} channel={channel} view={view} rows={rows} />;
}
