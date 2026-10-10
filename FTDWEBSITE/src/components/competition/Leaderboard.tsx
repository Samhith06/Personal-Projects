import { Icon } from '@/components/ui/Icon';
import { usd } from '@/lib/format';
import type { LeaderboardEntry } from '@/server/db/schema';

const PLACE = { 1: '1st', 2: '2nd', 3: '3rd' } as const;

function Trend({ value }: { value: number | null }) {
  if (value === null) return <span className="lb-trend lb-trend--new">New</span>;
  if (value === 0) return <span className="lb-trend lb-trend--flat">— 0</span>;
  const up = value > 0;
  return (
    <span className={`lb-trend lb-trend--${up ? 'up' : 'down'}`} aria-label={`${up ? 'Up' : 'Down'} ${Math.abs(value)} places`}>
      <Icon name={up ? 'trend-up' : 'trend-down'} />
      {up ? '+' : '−'}
      {Math.abs(value)}
    </span>
  );
}

export function LbPodium({ entries }: { entries: LeaderboardEntry[] }) {
  const byRank = (r: number) => entries.find((e) => e.rank === r);
  const order = [byRank(2), byRank(1), byRank(3)].filter((e): e is LeaderboardEntry => Boolean(e));

  return (
    <ol className="lb-podium" aria-label="Top three">
      {order.map((e) => {
        return (
          <li key={e.id} className={`lb-card lb-card--${e.rank}`} value={e.rank}>
            <Icon name="trophy" className="lb-card__trophy" />
            <p className="lb-card__place">{PLACE[e.rank as 1 | 2 | 3]}</p>
            <p className="lb-card__user">{e.username}</p>
            <p className="lb-card__amount">{usd(e.wagered)}</p>
            <p className="lb-card__prize">{e.prize ? `Prize · ${usd(e.prize)}` : 'All-time legend'}</p>
            <Trend value={e.movement} />
          </li>
        );
      })}
    </ol>
  );
}

export function LbRows({ entries, highlightUserId }: { entries: LeaderboardEntry[]; highlightUserId?: string }) {
  const rest = entries.filter((e) => e.rank > 3);
  if (!rest.length) return null;
  return (
    <div className="lb-list" role="table" aria-label="Ranks 4 and below">
      <div className="sr-only" role="row">
        <span role="columnheader">Rank</span>
        <span role="columnheader">Player</span>
        <span role="columnheader">Wagered</span>
        <span role="columnheader">Prize</span>
        <span role="columnheader">Movement</span>
      </div>
      {rest.map((e) => (
        <div key={e.id} role="row" className={`lb-line ${highlightUserId && e.userId === highlightUserId ? 'is-me' : ''}`}>
          <span role="cell" className="lb-line__rank">
            {String(e.rank).padStart(2, '0')}
          </span>
          <span role="cell" className="lb-line__user">
            {e.username}
            {highlightUserId && e.userId === highlightUserId ? <span className="tag tag--cyan">You</span> : null}
          </span>
          <span role="cell" className="lb-line__wager">
            {usd(e.wagered)}
          </span>
          <span role="cell" className="lb-line__prize">
            {e.prize ? usd(e.prize) : '—'}
          </span>
          <span role="cell" className="lb-line__move">
            <Trend value={e.movement} />
          </span>
        </div>
      ))}
    </div>
  );
}
