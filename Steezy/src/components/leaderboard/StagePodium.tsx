import type { Standing } from '@/server/services/leaderboards';
import { formatUsd } from '@/lib/format';

/** $564.41 with the cents set smaller, as on the reference design. */
function Money({ value }: { value: number }) {
  const [whole, cents] = value.toFixed(2).split('.');
  return (
    <span className="num">
      ${Number(whole).toLocaleString('en-US')}
      <small>.{cents}</small>
    </span>
  );
}

/** Top 3 on pedestals: 2nd · 1st · 3rd, crown on the winner, prize chip above each block. */
export function StagePodium({ top }: { top: Standing[] }) {
  const order = [top[1], top[0], top[2]];
  return (
    <div className="stage">
      {order.map((s, i) => {
        const rank = [2, 1, 3][i];
        if (!s) return <div key={rank} className={`stage__place stage__place--${rank} is-empty`} />;
        return (
          <div key={rank} className={`stage__place stage__place--${rank}`}>
            {rank === 1 ? (
              <svg className="stage__crown" width="28" height="22" viewBox="0 0 28 22" aria-hidden="true">
                <path d="M2 6l6 6 6-10 6 10 6-6-2 14H4z" fill="currentColor" />
              </svg>
            ) : null}
            <span className="stage__avatar">
              {s.displayName[0]?.toUpperCase()}
              <span className="stage__badge">{rank}</span>
            </span>
            <span className="stage__name">{s.displayName}</span>
            <span className="stage__wager">
              <Money value={s.wagered} />
              <span>Wagered</span>
            </span>
            <span className="stage__prize">
              <span>Prize</span>
              <b className="num">{formatUsd(s.prize)}</b>
            </span>
            <span className="stage__block" aria-label={`${rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd'} place`}>
              {rank}
            </span>
          </div>
        );
      })}
    </div>
  );
}
