import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Flash, type FlashParams } from '@/components/admin/Flash';
import { HuntDetail } from '@/components/admin/HuntDetail';
import { getHunt, huntWinnerName } from '@/server/services/hunts';

export const metadata: Metadata = { title: 'Hunt' };

/** One past hunt: its numbers, every bonus, and its settings. */
export default async function HuntAdmin({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: FlashParams }) {
  const { id } = await params;
  const flash = await searchParams;
  const hunt = await getHunt(decodeURIComponent(id));
  if (!hunt) notFound();
  const winnerName = await huntWinnerName(hunt);

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div>
        <Link href="/admin/hunts/history" className="meta">
          ← Hunt history
        </Link>
        <h1 className="admin__title">{hunt.title}</h1>
      </div>
      <Flash {...flash} />
      <HuntDetail hunt={hunt} winnerName={winnerName} back={`/admin/hunts/${encodeURIComponent(hunt.id)}`} />
    </div>
  );
}
