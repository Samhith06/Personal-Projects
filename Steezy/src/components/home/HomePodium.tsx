import Link from 'next/link';
import { currentLeaderboard, getStandings } from '@/server/services/leaderboards';
import { formatCountdown, formatUsd, metricLabel, ordinal } from '@/lib/format';

const MEDALS = ['var(--medal-gold)', 'var(--medal-silver)', 'var(--medal-bronze)'];

/** The leaderboard's top 3 as a podium, linking to the full board. Renders nothing without a board. */
export async function HomePodium() {
  const board = await currentLeaderboard();
  if (!board) return null;
  const top = (await getStandings(board)).slice(0, 3);
  const pool = board.prizes.reduce((a, b) => a + b, 0);
  const countdown = board.status === 'live' ? formatCountdown(board.endsAt) : null;
  // Visual order 2nd, 1st, 3rd.
  const order = [top[1], top[0], top[2]].filter(Boolean);

  return (
    <section className="container home-section" aria-labelledby="home-lb-title">
      <div className="lb-head">
        <div className="stack" style={{ gap: 8 }}>
          <span className="kicker">
            {board.name} · <b style={{ color: 'var(--color-roobet)', fontStyle: 'italic' }}>Roobet</b>
          </span>
          <h2 id="home-lb-title" style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}>
            {formatUsd(pool)} leaderboard
          </h2>
        </div>
        <div className="row" style={{ gap: 24 }}>
          {countdown ? (
            <div>
              <div className="meta">Ends in</div>
              <div className="num lb-head__value">{countdown}</div>
            </div>
          ) : null}
          <Link className="btn btn--secondary" href="/leaderboard">
            Full leaderboard
          </Link>
        </div>
      </div>

      {order.length ? (
        <div className="podium podium--compact">
          {order.map((s) => (
            <div key={s.rank} className={`podium__place podium__place--${s.rank}`}>
              <span className="podium__avatar" style={{ boxShadow: `0 0 0 2px var(--color-bg), 0 0 0 4px ${MEDALS[s.rank - 1]}` }}>
                {s.displayName[0]?.toUpperCase()}
              </span>
              <div>
                <div className="podium__name">{s.displayName}</div>
                <div className="meta num">{formatUsd(s.wagered)} {metricLabel(board.metric)}</div>
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
      ) : (
        <div className="card">
          <p className="meta">No wagers yet this month — the first $1 under code STZY takes the top spot.</p>
        </div>
      )}
    </section>
  );
}
