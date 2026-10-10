import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Countdown } from '@/components/ui/client';
import { Medallion, Movement, ProgressBar } from '@/components/ui/primitives';
import { dateLabel, num, ordinal, percent, usd } from '@/lib/format';
import type { Challenge, LeaderboardEntry, Milestone, Raffle, Streamer } from '@/server/db/schema';

/* ------------------------------------------------------------------ Podium */

const RING = { 1: 'gold', 2: 'silver', 3: 'bronze' } as const;

export function Podium({ entries, compact = false }: { entries: LeaderboardEntry[]; compact?: boolean }) {
  const top = entries.filter((e) => e.rank <= 3);
  // Visual order: 2nd, 1st, 3rd.
  const ordered = [top.find((e) => e.rank === 2), top.find((e) => e.rank === 1), top.find((e) => e.rank === 3)].filter(
    (e): e is LeaderboardEntry => Boolean(e),
  );

  return (
    <ol className={`podium ${compact ? 'podium--compact' : ''}`} aria-label="Top three">
      {ordered.map((e) => (
        <li key={e.id} className={`podium__place podium__place--${e.rank}`} value={e.rank}>
          <span className="podium__glow" aria-hidden="true" />
          <p className="podium__rank">
            <span className="podium__rank-n">{e.rank}</span>
            <sup>{ordinal(e.rank)}</sup>
          </p>
          <Medallion
            monogram={e.username.slice(0, 2).toUpperCase()}
            imageUrl={e.avatarUrl}
            size={e.rank === 1 ? 'lg' : 'md'}
            ring={RING[e.rank as 1 | 2 | 3]}
            accent="steel"
          />
          <p className="podium__user">
            {e.username} <Movement value={e.movement} />
          </p>
          <p className="podium__label">Wagered</p>
          <p className="podium__amount tabular">{usd(e.wagered)}</p>
          <p className="podium__prize">
            <Icon name="trophy" />
            {e.prize ? `${usd(e.prize)} prize` : 'All-time legend'}
          </p>
          <span className="podium__plinth" aria-hidden="true">
            <span>{e.rank}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------- Rows */

export function LeaderboardTable({ entries, highlightUserId }: { entries: LeaderboardEntry[]; highlightUserId?: string }) {
  return (
    <div className="lb-table" role="table" aria-label="Leaderboard standings">
      <div className="lb-row lb-row--head" role="row">
        <span role="columnheader">Rank</span>
        <span role="columnheader">Player</span>
        <span role="columnheader">Wagered</span>
        <span role="columnheader" className="lb-row__progress">
          Progress
        </span>
        <span role="columnheader">Prize</span>
        <span role="columnheader" className="lb-row__move">
          Move
        </span>
      </div>
      {entries.map((e, i) => {
        const above = i > 0 ? entries[i - 1] : null;
        const gap = above ? above.wagered - e.wagered : 0;
        return (
          <div
            key={e.id}
            role="row"
            className={`lb-row ${e.rank <= 3 ? `lb-row--top lb-row--${e.rank}` : ''} ${highlightUserId && e.userId === highlightUserId ? 'is-me' : ''}`}
          >
            <span role="cell" className="lb-row__rank tabular">
              {String(e.rank).padStart(2, '0')}
            </span>
            <span role="cell" className="lb-row__user">
              <Medallion
                monogram={e.username.slice(0, 2).toUpperCase()}
                imageUrl={e.avatarUrl}
                size="sm"
                ring={e.rank <= 3 ? RING[e.rank as 1 | 2 | 3] : 'steel'}
                accent="steel"
              />
              <span>
                {e.username}
                {highlightUserId && e.userId === highlightUserId ? <span className="tag tag--cyan lb-row__you">You</span> : null}
              </span>
            </span>
            <span role="cell" className="lb-row__wager tabular">
              {usd(e.wagered)}
            </span>
            <span role="cell" className="lb-row__progress">
              <ProgressBar
                value={e.wagered}
                max={above ? above.wagered : e.wagered}
                label={above ? `Progress toward rank ${above.rank}` : 'Leading'}
                tone={e.rank === 1 ? 'gold' : 'cyan'}
                size="thin"
              />
              <span className="lb-row__gap">{above ? `${usd(gap)} to #${above.rank}` : 'Holding #1'}</span>
            </span>
            <span role="cell" className="lb-row__prize tabular">
              {e.prize ? usd(e.prize) : '—'}
            </span>
            <span role="cell" className="lb-row__move">
              <Movement value={e.movement} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- Challenge */

const CHALLENGE_STATUS: Record<string, string> = { active: 'Active', upcoming: 'Upcoming', completed: 'Completed' };

export function ChallengeCard({
  challenge,
  host,
  featured = false,
  joined,
}: {
  challenge: Challenge;
  host?: Streamer;
  featured?: boolean;
  joined?: boolean;
}) {
  const c = challenge;
  const value = (n: number) => (c.goalType === 'currency' ? usd(n) : num(n));
  const p = percent(c.goalCurrent, c.goalTarget);

  return (
    <article className={`challenge challenge--${c.status} ${featured ? 'challenge--featured frame-gold' : ''}`}>
      <header className="challenge__head">
        <span className={`tag ${c.status === 'active' ? 'tag--gold' : c.status === 'completed' ? 'tag--success' : ''}`}>
          {c.status === 'active' ? <span className="live-dot" aria-hidden="true" /> : null}
          {CHALLENGE_STATUS[c.status] ?? c.status}
        </span>
        <span className="challenge__dates">
          <Icon name="calendar" />
          {dateLabel(c.startsAt, 'UTC')} – {dateLabel(c.endsAt, 'UTC')}
        </span>
      </header>

      <h3 className="challenge__name">{c.name}</h3>
      <p className="challenge__desc">{c.description}</p>

      <div className="challenge__goal">
        <div className="challenge__goal-row">
          <span className="kicker">{c.goalLabel}</span>
          <span className="challenge__pct tabular">{Math.floor(p)}%</span>
        </div>
        <ProgressBar
          value={c.goalCurrent}
          max={c.goalTarget}
          label={`${c.name} progress`}
          tone={c.status === 'completed' ? 'steel' : 'gold'}
          size={featured ? 'lg' : undefined}
        />
        <p className="challenge__nums tabular">
          <strong>{value(c.goalCurrent)}</strong> of {value(c.goalTarget)}
          {c.goalUnit ? ` ${c.goalUnit}` : ''}
        </p>
      </div>

      <dl className="challenge__meta">
        <div>
          <dt>Prize</dt>
          <dd>{c.prize}</dd>
        </div>
        <div>
          <dt>Players</dt>
          <dd className="tabular">{c.participants ? num(c.participants) : '—'}</dd>
        </div>
        <div>
          <dt>{c.status === 'upcoming' ? 'Starts in' : c.status === 'active' ? 'Ends in' : 'Ended'}</dt>
          <dd>
            {c.status === 'completed' ? (
              dateLabel(c.endsAt, 'UTC')
            ) : (
              <Countdown
                compact
                target={(c.status === 'upcoming' ? c.startsAt : c.endsAt).toISOString()}
                label={`${c.name} ${c.status === 'upcoming' ? 'starts' : 'ends'} in`}
              />
            )}
          </dd>
        </div>
      </dl>

      <footer className="challenge__foot">
        {host ? (
          <Link href={`/streamers/${host.id}`} className="challenge__host">
            <Medallion monogram={host.monogram} accent={host.accent} size="xs" />
            Hosted by {host.displayName}
          </Link>
        ) : (
          <span />
        )}
        {joined ? (
          <span className="tag tag--success">
            <Icon name="check" />
            Joined
          </span>
        ) : null}
      </footer>
    </article>
  );
}

/* ------------------------------------------------------------------- Raffle */

export const RAFFLE_ART_LABEL: Record<string, string> = {
  rig: 'Gaming rig',
  cash: 'Cash',
  console: 'Console',
  travel: 'Travel',
  chips: 'Chip set',
  watch: 'Watch',
};

export function RaffleArt({ art }: { art: string }) {
  const stroke = 'url(#raffleGold)';
  const cyan = '#4fd8ff';
  return (
    <svg className="raffle-art" viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id="raffleGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3dfa2" />
          <stop offset=".5" stopColor="#c9a24a" />
          <stop offset="1" stopColor="#8d6a2a" />
        </linearGradient>
      </defs>
      <g fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
        {art === 'rig' ? (
          <>
            <rect x="14" y="28" width="62" height="42" rx="3" />
            <path d="M36 82h18M45 70v12" />
            <rect x="84" y="24" width="24" height="62" rx="3" />
            <circle cx="96" cy="38" r="5" />
            <circle cx="96" cy="56" r="5" />
            <path d="M22 60l12-14 10 8 14-16 10 6" stroke={cyan} strokeOpacity=".8" />
          </>
        ) : null}
        {art === 'cash' ? (
          <>
            <rect x="18" y="46" width="72" height="38" rx="3" />
            <rect x="26" y="38" width="72" height="38" rx="3" />
            <rect x="34" y="30" width="72" height="38" rx="3" />
            <circle cx="70" cy="49" r="9" />
            <path d="M70 43v12M67 46h5a2 2 0 0 1 0 4h-4a2 2 0 0 0 0 4h5" />
            <path d="M42 38h8M90 60h8" stroke={cyan} strokeOpacity=".8" />
          </>
        ) : null}
        {art === 'console' ? (
          <>
            <path d="M30 42h60c9 0 14 6 16 16l4 20c2 9-8 14-14 7l-9-10H33l-9 10c-6 7-16 2-14-7l4-20c2-10 7-16 16-16Z" />
            <path d="M36 54v14M29 61h14" />
            <circle cx="80" cy="56" r="3" />
            <circle cx="89" cy="64" r="3" />
            <path d="M52 50h16" stroke={cyan} strokeOpacity=".8" />
          </>
        ) : null}
        {art === 'travel' ? (
          <>
            <path d="M14 92h92M22 92V70h10v22M38 92V56h12v36M56 92V62h8v30M70 92V44h14v48M90 92V66h10v26" />
            <path d="M26 34l34 6 20-12c4-2 8 1 5 4L68 44l-8 16-5-1 3-14-20-3-6 6-4-1 4-9Z" stroke={cyan} strokeOpacity=".85" />
          </>
        ) : null}
        {art === 'chips' ? (
          <>
            <ellipse cx="46" cy="80" rx="24" ry="8" />
            <path d="M22 80v-8M70 80v-8" />
            <ellipse cx="46" cy="72" rx="24" ry="8" />
            <path d="M22 72v-8M70 72v-8" />
            <ellipse cx="46" cy="64" rx="24" ry="8" />
            <circle cx="82" cy="52" r="22" />
            <circle cx="82" cy="52" r="14" stroke={cyan} strokeOpacity=".8" />
          </>
        ) : null}
        {art === 'watch' ? (
          <>
            <path d="M46 16h28l4 20H42l4-20ZM46 104h28l4-20H42l4 20Z" />
            <circle cx="60" cy="60" r="26" />
            <circle cx="60" cy="60" r="20" stroke={cyan} strokeOpacity=".7" />
            <path d="M60 46v14l9 6M86 56h5v8h-5" />
          </>
        ) : null}
      </g>
    </svg>
  );
}

const RAFFLE_STATUS: Record<string, string> = { active: 'Active', upcoming: 'Upcoming', ended: 'Ended' };

export function RaffleCard({
  raffle,
  entered,
  action,
  featured = false,
}: {
  raffle: Raffle;
  entered?: boolean;
  action?: ReactNode;
  featured?: boolean;
}) {
  const r = raffle;
  return (
    <article className={`raffle raffle--${r.status} ${featured ? 'raffle--featured' : ''}`}>
      <div className="raffle__media">
        {r.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.imageUrl} alt="" loading="lazy" />
        ) : (
          <RaffleArt art={r.art} />
        )}
        <span className="raffle__status">
          {r.status === 'active' ? <span className="live-dot" aria-hidden="true" /> : null}
          {RAFFLE_STATUS[r.status]}
        </span>
        <span className="raffle__value">
          <span className="gold-text tabular">{usd(r.value)}</span>
          <small>Prize value</small>
        </span>
      </div>

      <div className="raffle__body">
        <h3 className="raffle__name">{r.name}</h3>
        <p className="raffle__prize">{r.prize}</p>
        <p className="raffle__req">
          <Icon name="ticket" />
          <span>{r.requirement}</span>
        </p>

        <div className="raffle__timer">
          {r.status === 'ended' ? (
            <div className="raffle__winner">
              <Icon name="trophy" />
              <div>
                <p className="kicker">Winner</p>
                <p className="raffle__winner-name">{r.winnerHandle ?? 'To be announced'}</p>
              </div>
              <span className="muted">{dateLabel(r.endsAt, 'UTC')}</span>
            </div>
          ) : (
            <>
              <p className="kicker">{r.status === 'active' ? 'Draw closes in' : 'Entries open in'}</p>
              <Countdown
                target={(r.status === 'active' ? r.endsAt : r.startsAt).toISOString()}
                label={`${r.name} ${r.status === 'active' ? 'closes' : 'opens'} in`}
              />
            </>
          )}
        </div>

        <footer className="raffle__foot">
          <span className="raffle__entries tabular">
            <Icon name="users" />
            {r.status === 'upcoming' ? 'Entries open soon' : `${num(r.entries)} entries`}
          </span>
          {entered ? (
            <span className="tag tag--success">
              <Icon name="check" />
              Entered
            </span>
          ) : (
            action
          )}
        </footer>
      </div>
    </article>
  );
}

/* --------------------------------------------------------------- VIP tiers */

/**
 * The published VIP ladder.
 *
 * Each tier is a monthly wager target paired with the cash it pays. The tier
 * colours climb the same way the poster does — slate, bronze, silver, gold,
 * then the cooler high-end metals — so a member can see where they sit at a
 * glance without reading a number.
 */
const TIER_TONES = [
  '#9fb0c9',
  '#9fb0c9',
  '#c98f52',
  '#cfd6e2',
  '#e2c275',
  '#b6c6d8',
  '#7fd7f2',
  '#b98ce8',
  '#7fa6f0',
  '#5fd3a8',
  '#f0a24a',
  '#ef5f6d',
];

export function VipLadder({
  tiers,
  wagered,
  compact = false,
}: {
  tiers: Milestone[];
  /** The member's wager this month, or null when nobody is signed in. */
  wagered: number | null;
  compact?: boolean;
}) {
  const known = wagered ?? 0;

  return (
    <ol className={`vip-ladder ${compact ? 'vip-ladder--compact' : ''}`}>
      {tiers.map((tier, i) => {
        const prev = i === 0 ? 0 : tiers[i - 1].threshold;
        const done = wagered !== null && known >= tier.threshold;
        const current = wagered !== null && !done && known >= prev;
        const state = done ? 'done' : current ? 'current' : 'locked';

        return (
          <li
            key={tier.id}
            className={`vip vip--${state}`}
            style={{ ['--tone' as string]: TIER_TONES[i % TIER_TONES.length] }}
          >
            <span className="vip__rank" aria-hidden="true">
              {done ? <Icon name="check" /> : i + 1}
            </span>

            <div className="vip__body">
              <p className="vip__name">{tier.name}</p>
              <p className="vip__req">
                Monthly wager <b className="tabular">{usd(tier.threshold)}</b>
              </p>
              {tier.perk ? (
                <p className="vip__perk">
                  <Icon name="discord" />
                  {tier.perk}
                </p>
              ) : null}
              {wagered !== null && !compact ? (
                <>
                  <ProgressBar
                    value={Math.min(known, tier.threshold)}
                    max={tier.threshold}
                    label={`${tier.name} progress`}
                    tone={done ? 'gold' : current ? 'cyan' : 'steel'}
                    size="thin"
                  />
                  <p className="vip__status">{done ? 'Unlocked' : `${usd(tier.threshold - known)} to go`}</p>
                </>
              ) : null}
            </div>

            <span className="vip__cash tabular">{tier.cashReward > 0 ? usd(tier.cashReward) : tier.reward}</span>
            {/* Only a signed-in member has a state worth announcing. */}
            {wagered !== null ? <span className="sr-only">{done ? 'Unlocked' : current ? 'In progress' : 'Locked'}</span> : null}
          </li>
        );
      })}
    </ol>
  );
}
