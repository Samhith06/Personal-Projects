import type { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentUser } from '@/server/auth/session';
import { currentLeaderboard, getStandings } from '@/server/services/leaderboards';
import { syncStatus } from '@/server/services/sync-status';
import { approvedRoobetUid } from '@/server/services/wagers';
import { env } from '@/lib/env';
import { formatAgo, formatCountdown, formatUsd, ordinal } from '@/lib/format';

export const metadata: Metadata = { title: 'Leaderboard' };

const MEDALS = ['var(--medal-gold)', 'var(--medal-silver)', 'var(--medal-bronze)'];

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
  const countdown = board.status === 'live' ? formatCountdown(board.endsAt) : null;
  const podium = standings.slice(0, 3);
  // Visual order 2nd, 1st, 3rd.
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean);

  return (
    <div className="container page">
      <div className="lb-head">
        <div className="stack" style={{ gap: 10 }}>
          <span className="kicker">
            {board.name} · <b style={{ color: 'var(--color-roobet)', fontStyle: 'italic' }}>Roobet</b>
          </span>
          <h1 className="page__title">{formatUsd(pool)} prize pool</h1>
          <p className="meta" style={{ maxWidth: '48ch' }}>
            Wager on Roobet under code STZY. Top {paidPlaces} by total {board.metric === 'weighted' ? 'weighted ' : ''}wager get paid.
          </p>
        </div>
        <div className="row" style={{ gap: 28 }}>
          <div>
            <div className="meta">{countdown ? 'Ends in' : 'Status'}</div>
            <div className="num lb-head__value">{countdown ?? (board.status === 'live' ? 'Finalising' : 'Final')}</div>
          </div>
          <div>
            <div className="meta">Paid places</div>
            <div className="num lb-head__value">{paidPlaces}</div>
          </div>
        </div>
      </div>

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
        <>
          <div className="podium">
            {podiumOrder.map((s) => (
              <div key={s.rank} className={`podium__place podium__place--${s.rank}`}>
                <span className="podium__avatar" style={{ boxShadow: `0 0 0 2px var(--color-bg), 0 0 0 4px ${MEDALS[s.rank - 1]}` }}>
                  {s.displayName[0]?.toUpperCase()}
                </span>
                <div>
                  <div className="podium__name">{s.displayName}</div>
                  <div className="meta num">{formatUsd(s.wagered)} wagered</div>
                </div>
                <div className="podium__block" style={{ boxShadow: `inset 0 1px 0 0 ${MEDALS[s.rank - 1]}` }}>
                  <span className="podium__rank" style={{ color: MEDALS[s.rank - 1] }}>
                    {ordinal(s.rank)}
                  </span>
                  <span className="num podium__prize">{formatUsd(s.prize)}</span>
                </div>
              </div>
            ))}
          </div>

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
              Roobet affiliate data{sync?.lastOkAt ? ` · updated ${formatAgo(sync.lastOkAt)}` : ''}. Names are shown masked for
              privacy.
            </p>
          </div>
        </>
      )}

      <div className="row">
        <a className="btn btn--primary" href={env.roobetReferralUrl} target="_blank" rel="noopener sponsored">
          Play on Roobet with code STZY
        </a>
      </div>
    </div>
  );
}
