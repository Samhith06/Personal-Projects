import type { Metadata } from 'next';
import Link from 'next/link';
import { HuntBoard } from '@/components/bonus-hunt/HuntBoard';
import { Icon } from '@/components/ui/Icon';
import { EmptyState, Medallion, PageHero, SectionHeader } from '@/components/ui/primitives';
import { dateLabel, multiplier, usd } from '@/lib/format';
import { getCompletedHunts, getActiveHunt } from '@/server/services/bonus-hunt';
import { getStreamerMap } from '@/server/services/content';

export const metadata: Metadata = {
  title: 'Bonus hunt',
  description: 'The live FGDR bonus hunt board — every bonus, every payout, and what the rest still have to pay.',
};

export const dynamic = 'force-dynamic';

const STATUS_COPY: Record<string, string> = {
  collecting: 'Collecting bonuses',
  guessing: 'Guess the balance',
  opening: 'Opening now',
  complete: 'Finished',
};

export default async function BonusHuntPage() {
  const [hunt, past, streamers] = await Promise.all([getActiveHunt(), getCompletedHunts(8), getStreamerMap()]);
  const host = hunt ? streamers.get(hunt.streamerId) : undefined;

  return (
    <>
      <PageHero
        eyebrow="Bonus hunt"
        title={
          <>
            The <span className="gold-text">hunt</span> board
          </>
        }
        lede="Every bonus collected, every payout as it lands, and what the ones left still have to average."
      />

      {hunt ? (
        <section className="section">
          <div className="hunt-head">
            <div className="hunt-head__who">
              {host ? <Medallion monogram={host.monogram} imageUrl={host.avatarUrl} accent={host.accent} /> : null}
              <div>
                <p className="eyebrow">{STATUS_COPY[hunt.status] ?? hunt.status}</p>
                <h2 className="hunt-head__title">{hunt.title}</h2>
                {host ? (
                  <Link className="link-arrow" href={`/streamers/${host.id}`}>
                    {host.displayName}
                  </Link>
                ) : null}
              </div>
            </div>
            {hunt.status === 'opening' ? (
              <span className="status status--live">
                <span className="live-dot" aria-hidden="true" />
                Opening
              </span>
            ) : null}
          </div>

          {hunt.bonuses.length ? (
            <HuntBoard initial={hunt} />
          ) : (
            <EmptyState
              icon="sparkle"
              title="No bonuses on the board yet"
              body="They show up here as they're collected on stream."
            />
          )}
        </section>
      ) : (
        <section className="section">
          <EmptyState
            icon="sparkle"
            title="No hunt running right now"
            body="When the crew starts collecting bonuses, the board appears here live."
          />
        </section>
      )}

      {past.length ? (
        <section className="section">
          <SectionHeader eyebrow="The record" title="Previous hunts" />
          <div className="hunt-past">
            {past.map((h) => {
              const host = streamers.get(h.streamerId);
              const up = h.stats.profit >= 0;
              return (
                <article key={h.id} className="hunt-past__row panel">
                  <div>
                    <p className="hunt-past__title">{h.title}</p>
                    <p className="muted">
                      {host?.displayName ?? 'FGDR'} · {h.endedAt ? dateLabel(h.endedAt) : dateLabel(h.startedAt)} ·{' '}
                      {h.stats.total} bonuses
                    </p>
                  </div>
                  <dl className="hunt-past__figures">
                    <div>
                      <dt>Start</dt>
                      <dd>{usd(h.startBalance)}</dd>
                    </div>
                    <div>
                      <dt>Returned</dt>
                      <dd>{usd(h.stats.won)}</dd>
                    </div>
                    <div>
                      <dt>Average</dt>
                      <dd>{h.stats.totalBet ? multiplier(h.stats.won, h.stats.totalBet) : '—'}</dd>
                    </div>
                    <div>
                      <dt>Result</dt>
                      <dd className={up ? 'hunt-up' : 'hunt-down'}>
                        <Icon name={up ? 'trophy' : 'flag'} />
                        {usd(h.stats.profit)}
                      </dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </>
  );
}
