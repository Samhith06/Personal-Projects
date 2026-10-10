import type { Metadata } from 'next';
import { LiveHub } from '@/components/live/LiveHub';
import { StreamerLiveCard } from '@/components/live/StreamerLiveCard';
import { PageHero, SectionHeader } from '@/components/ui/primitives';
import { getStreamers } from '@/server/services/content';
import { toLiveCardStreamers } from '@/server/services/views';

export const metadata: Metadata = {
  title: 'Live',
  description: 'Watch the FGDR crew live on Kick — see who is streaming right now and switch channels without leaving the site.',
};

export const dynamic = 'force-dynamic';

export default async function LivePage() {
  const streamers = await getStreamers();
  const cards = toLiveCardStreamers(streamers);

  return (
    <>
      <PageHero
        eyebrow="On Kick"
        title={
          <>
            FGDR <span className="gold-text">live</span>
          </>
        }
        lede="Every channel in one place. Watch here, switch between the crew, or jump over to Kick."
      />

      <section className="section section--flush-top" style={{ paddingTop: 'clamp(2.5rem, 2rem + 2vw, 4rem)' }}>
        <div className="container">
          <LiveHub streamers={cards} />
        </div>
      </section>

      <section className="section section--sm">
        <div className="container">
          <SectionHeader eyebrow="Channels" title={`All ${cards.length} channels`} />
          <div className="live-grid reveal">
            {cards.map((s) => (
              <StreamerLiveCard key={s.id} streamer={s} variant="hub" />
            ))}
          </div>
        </div>
      </section>

    </>
  );
}
