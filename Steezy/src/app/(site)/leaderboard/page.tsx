import type { Metadata } from 'next';
import Link from 'next/link';
import { RaceCountdown } from '@/components/leaderboard/Countdown';
import { StagePodium } from '@/components/leaderboard/StagePodium';
import { LossBackTag, VipTransferTag } from '@/components/VipTransferTag';
import { getCurrentUser } from '@/server/auth/session';
import { currentLeaderboard, getStandings } from '@/server/services/leaderboards';
import { syncStatus } from '@/server/services/sync-status';
import { approvedRoobetUid } from '@/server/services/wagers';
import { env } from '@/lib/env';
import { formatAgo, formatUsd, ordinal } from '@/lib/format';

export const metadata: Metadata = { title: 'Leaderboard' };

export default async function LeaderboardPage() {
  const board = await currentLeaderboard();
  if (!board) {
    return (
      <div className="container page">
        <span className="kicker">Monthly leaderboard</span>
        <h1 className="page__title">No leaderboard running yet</h1>
        <p className="meta">Check back soon — or sign up on Roobet with code STZY so you&apos;re ready when it starts.</p>
      </div>
    );
  }

  const [standings, user, sync] = await Promise.all([getStandings(board), getCurrentUser(), syncStatus('roobet')]);
  const myUid = user ? await approvedRoobetUid(user.id) : null;
  const mine = myUid ? standings.find((s) => s.roobetUid === myUid) : null;

  const pool = board.prizes.reduce((a, b) => a + b, 0);
  const paidPlaces = board.prizes.filter((p) => p > 0).length;
  const month = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const span = month(board.startsAt) === month(board.endsAt) ? month(board.startsAt) : `${month(board.startsAt)} – ${month(board.endsAt)}`;

  return (
    <div className="container page">
      <section className="race">
        <div className="race__intro">
          <img src="/brand/roobet-logo-gold.png" alt="Roobet" width={131} height={40} className="race__logo" />
          <span className="kicker">Monthly wager race · {span}</span>
          <h1 className="race__pool num">{formatUsd(pool)}</h1>
          <p className="race__lede">
            Play on Roobet with code STZY and every bet counts. Top {paidPlaces} at the end of the month split {formatUsd(pool)}.
          </p>
          {board.status === 'live' ? (
            <RaceCountdown startsAt={board.startsAt.toISOString()} endsAt={board.endsAt.toISOString()} serverNow={new Date().toISOString()} />
          ) : (
            <p className="tag tag--neutral" style={{ alignSelf: 'flex-start' }}>
              Final standings
            </p>
          )}
          <div className="row" style={{ gap: 12 }}>
            <a className="btn btn--primary" href={env.roobetReferralUrl} target="_blank" rel="noopener sponsored">
              Play on Roobet →
            </a>
          </div>
          <div className="perk-tags">
            <LossBackTag />
            <VipTransferTag />
          </div>
        </div>
        <div className="race__stage">{standings.length ? <StagePodium top={standings.slice(0, 3)} /> : null}</div>
      </section>

      {mine ? (
        <p className="notice notice--ok">
          You&apos;re <b>{ordinal(mine.rank)}</b> with {formatUsd(mine.wagered)} wagered
          {mine.rank > 1 ? ` · ${formatUsd(standings[mine.rank - 2].wagered - mine.wagered)} behind ${ordinal(mine.rank - 1)}` : ''}.
        </p>
      ) : user && !myUid ? (
        <p className="notice notice--ok">
          <Link href="/me/link">Link your Roobet username</Link> to see your own rank here.
        </p>
      ) : null}

      {standings.length === 0 ? (
        <div className="card">
          <p className="meta">No wagers counted yet this period.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: '8px 12px' }}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 64 }}>Rank</th>
                  <th>Player</th>
                  <th style={{ textAlign: 'right' }}>Wagered</th>
                  <th style={{ textAlign: 'right', width: 110 }}>Prize</th>
                </tr>
              </thead>
              <tbody>
                {standings.slice(3, 50).map((s) => (
                  <tr key={s.rank} className={s.roobetUid === myUid ? 'is-me' : undefined}>
                    <td className="meta num">{s.rank}</td>
                    <td>{s.displayName}</td>
                    <td className="num" style={{ textAlign: 'right' }}>
                      {formatUsd(s.wagered)}
                    </td>
                    <td className="num" style={{ textAlign: 'right', color: 'var(--color-accent)' }}>
                      {s.prize ? formatUsd(s.prize) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="meta" style={{ padding: '12px 8px 6px' }}>
            Roobet affiliate data{sync?.lastOkAt ? ` · updated ${formatAgo(sync.lastOkAt)}` : ''}. Names are shown masked for privacy.
          </p>
        </div>
      )}
    </div>
  );
}
