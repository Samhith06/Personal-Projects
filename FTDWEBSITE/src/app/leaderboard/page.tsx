import type { Metadata } from 'next';
import Link from 'next/link';
import { LbPodium, LbRows } from '@/components/competition/Leaderboard';
import { Countdown } from '@/components/ui/client';
import { EmptyState } from '@/components/ui/primitives';
import { crewDateTimeLabel, usd } from '@/lib/format';
import { getCurrentUser } from '@/server/auth/session';
import {
  DEFAULT_LEADERBOARD_SITE,
  LEADERBOARD_SITES,
  LEADERBOARD_SITE_LABEL,
  getLeaderboard,
  isLeaderboardSite,
  type LeaderboardSite,
} from '@/server/services/content';

export const metadata: Metadata = {
  title: 'Wager leaderboard',
  description: 'The FGDR Stake.com and Stake.eu wager leaderboards.',
};

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage({ searchParams }: PageProps<'/leaderboard'>) {
  const params = await searchParams;
  const site: LeaderboardSite = isLeaderboardSite(params.board as string) ? (params.board as LeaderboardSite) : DEFAULT_LEADERBOARD_SITE;
  const here = site === DEFAULT_LEADERBOARD_SITE ? '/leaderboard' : `/leaderboard?board=${site}`;

  const [{ board, entries }, user] = await Promise.all([getLeaderboard(site, 25), getCurrentUser()]);
  const mine = user ? entries.find((e) => e.userId === user.id) : undefined;
  const now = new Date();

  return (
    <section className="section lb-section">
      <div className="container">
        <header className="lb-head">
          <p className="lb-eyebrow">03 — Competition</p>
          <h1 className="lb-title">FGDR wager leaderboard</h1>
          <p className="lede">Every wager counts. Climb the ranks, claim the podium, and take the prize pool.</p>

          <div className="lb-toolbar">
            <nav className="segmented" aria-label="Stake site">
              {LEADERBOARD_SITES.map((s) => (
                <Link
                  key={s}
                  href={s === DEFAULT_LEADERBOARD_SITE ? '/leaderboard' : `/leaderboard?board=${s}`}
                  aria-current={s === site ? 'page' : undefined}
                  scroll={false}
                >
                  {LEADERBOARD_SITE_LABEL[s]}
                </Link>
              ))}
            </nav>

            {board ? (
              <dl className="lb-meta">
                {board.prizePool ? (
                  <div>
                    <dt>Prize pool</dt>
                    <dd className="gold-text">{usd(board.prizePool)}</dd>
                  </div>
                ) : null}
                {board.startsAt && board.startsAt > now ? (
                  <div title={`Starts ${crewDateTimeLabel(board.startsAt)}`}>
                    <dt>Starts in</dt>
                    <dd>
                      <Countdown compact target={board.startsAt.toISOString()} label={`${board.label} leaderboard starts in`} />
                    </dd>
                  </div>
                ) : board.endsAt && board.endsAt <= now ? (
                  <div title={`Ended ${crewDateTimeLabel(board.endsAt)}`}>
                    <dt>Status</dt>
                    <dd>Ended</dd>
                  </div>
                ) : board.endsAt ? (
                  <div title={`Ends ${crewDateTimeLabel(board.endsAt)}`}>
                    <dt>Ends in</dt>
                    <dd>
                      <Countdown compact target={board.endsAt.toISOString()} label={`${board.label} leaderboard ends in`} />
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt>Your rank</dt>
                  <dd>
                    {user ? (
                      mine ? (
                        `#${mine.rank}`
                      ) : (
                        'Unranked'
                      )
                    ) : (
                      <Link href={`/login?returnTo=${encodeURIComponent(here)}`} className="lb-meta__link">
                        Log in
                      </Link>
                    )}
                  </dd>
                </div>
              </dl>
            ) : null}
          </div>
        </header>

        {!board || entries.length === 0 ? (
          <EmptyState
            title="No standings yet"
            body={`The ${LEADERBOARD_SITE_LABEL[site]} board fills up as soon as the first wagers come in.`}
            icon="chart"
          />
        ) : (
          <>
            <div className="reveal">
              <LbPodium entries={entries} />
            </div>
            <div className="reveal" style={{ ['--reveal-delay' as string]: '120ms' }}>
              <LbRows entries={entries} highlightUserId={user?.id} />
            </div>
          </>
        )}

        <p className="fineprint">
          {board?.startsAt && board.endsAt
            ? `The ${LEADERBOARD_SITE_LABEL[site]} race runs ${crewDateTimeLabel(board.startsAt)} – ${crewDateTimeLabel(board.endsAt)} (German time). `
            : null}
          Stake.com and Stake.eu are separate races with separate prizes. Usernames are partially hidden for privacy. Standings update throughout the day and are final once verified. Prizes
          are subject to the leaderboard rules. 18+ only; gamble responsibly.
        </p>
      </div>
    </section>
  );
}
