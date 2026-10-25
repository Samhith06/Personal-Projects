import type { Metadata } from 'next';
import Link from 'next/link';
import { RaceCountdown } from '@/components/leaderboard/Countdown';
import { RaceStats } from '@/components/leaderboard/RaceStats';
import { StagePodium } from '@/components/leaderboard/StagePodium';
import { LossBackTag, VipTransferTag } from '@/components/VipTransferTag';
import { getCurrentUser } from '@/server/auth/session';
import { boardTotals, currentLeaderboard, getStandings } from '@/server/services/leaderboards';
import { syncStatus } from '@/server/services/sync-status';
import { approvedRoobetUid } from '@/server/services/wagers';
import { env } from '@/lib/env';
import { formatAgo, formatUsd, metricLabel, ordinal } from '@/lib/format';

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

  const [standings, user, sync, totals] = await Promise.all([getStandings(board), getCurrentUser(), syncStatus('roobet'), boardTotals(board)]);
  const myUid = user ? await approvedRoobetUid(user.id) : null;
  const mine = myUid ? standings.find((s) => s.roobetUid === myUid) : null;

  const pool = board.prizes.reduce((a, b) => a + b, 0);
  const label = metricLabel(board.metric);
  const weighted = board.metric === 'weighted';
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
            Play on Roobet with code STZY and every bet counts{weighted ? ' (ranked by Roobet’s weighted wager)' : ''}. Top {paidPlaces} at the end of the month split {formatUsd(pool)}.
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
        <div className="race__stage">{standings.length ? <StagePodium top={standings.slice(0, 3)} label={weighted ? 'Weighted' : 'Wagered'} /> : null}</div>
      </section>

      <RaceStats
        weighted={totals.weighted}
        wagered={totals.wagered}
        players={totals.players}
        status={board.status !== 'live' ? 'final' : board.startsAt > new Date() ? 'upcoming' : 'live'}
      />

      {mine ? (
        <p className="notice notice--ok">
          You&apos;re <b>{ordinal(mine.rank)}</b> with {formatUsd(mine.wagered)} {label}
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
                  <th style={{ textAlign: 'right' }}>{weighted ? 'Weighted' : 'Wagered'}</th>
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

      {weighted ? (
        // Wording required by Roobet for weighted leaderboards.
        <div className="card stack" style={{ gap: 8, fontSize: 14 }}>
          <strong>How wagers are counted</strong>
          <p className="meta">Leaderboard wager amounts may differ from your statistics on Roobet, depending on the games you are playing:</p>
          <ul className="meta" style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
            <li>Games with RTP of 97% or lower → 100% of wager is counted</li>
            <li>Games with RTP between 97.01% and 98.99% → 50% of wager is counted</li>
            <li>Games with RTP of 99% and over → 10% of wager is counted</li>
          </ul>
          <p className="meta">Any abuse found by STZY or Roobet may result in your prize being forfeit.</p>
        </div>
      ) : null}
    </div>
  );
}
