import { formatUsd } from '@/lib/format';

type Props = {
  weighted: number;
  wagered: number;
  players: number;
  status: 'live' | 'upcoming' | 'final';
};

const ICONS = {
  dollar: (
    <>
      <path d="M12 2v20" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </>
  ),
  trend: (
    <>
      <path d="m22 7-8.5 8.5-5-5L2 17" />
      <path d="M16 7h6v6" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
};

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

const STATUS = { live: 'Live', upcoming: 'Soon', final: 'Final' } as const;

/** The race at a glance: weighted and raw wager in the window, players, and whether it's running. */
export function RaceStats({ weighted, wagered, players, status }: Props) {
  return (
    <section className="race-stats" aria-label="Race totals">
      <div className="race-stat">
        <span className="race-stat__icon">
          <Icon name="dollar" />
        </span>
        <span className="race-stat__value num race-stat__value--accent">{formatUsd(weighted)}</span>
        <span className="race-stat__label">Weighted wager</span>
      </div>
      <div className="race-stat">
        <span className="race-stat__icon">
          <Icon name="trend" />
        </span>
        <span className="race-stat__value num race-stat__value--gold">{formatUsd(wagered)}</span>
        <span className="race-stat__label">Unweighted wager (USD)</span>
      </div>
      <div className="race-stat">
        <span className="race-stat__icon">
          <Icon name="users" />
        </span>
        <span className="race-stat__value num">{players.toLocaleString('en-US')}</span>
        <span className="race-stat__label">Active players</span>
      </div>
      <div className="race-stat">
        <span className="race-stat__icon">
          <span className={`race-stat__dot race-stat__dot--${status}`} />
        </span>
        <span className={`race-stat__value race-stat__value--${status}`}>{STATUS[status]}</span>
        <span className="race-stat__label">Leaderboard status</span>
      </div>
    </section>
  );
}
