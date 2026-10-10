'use client';

import { useEffect, useRef, useState } from 'react';
import { bonusKindLabel } from '@/lib/bonus-hunt';
import { multiplier, usd } from '@/lib/format';
import type { BonusHuntView, HuntBonusView } from '@/lib/types';

/** Overlays sit on stream for hours; this is quick enough to feel live. */
const POLL_MS = 5_000;
/** How long a freshly opened bonus stays highlighted. */
const FRESH_MS = 6_000;

export type OverlayView = 'board' | 'bar' | 'current';

/**
 * A bonus hunt as an OBS browser source.
 *
 * Unlike the public board it follows the channel from hunt to hunt — an
 * overlay is added to a scene once and left there — and it renders nothing at
 * all when the channel has no hunt, so it can stay in the scene between hunts.
 */
export function HuntOverlay({
  initial,
  channel,
  view,
  rows,
}: {
  initial: BonusHuntView | null;
  channel: string;
  view: OverlayView;
  rows: number;
}) {
  const [hunt, setHunt] = useState(initial);
  const fresh = useFreshBonuses(hunt);

  useEffect(() => {
    let controller: AbortController | undefined;
    const refresh = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const res = await fetch(`/api/bonus-hunt?channel=${encodeURIComponent(channel)}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        if (res.ok) setHunt((await res.json()) as BonusHuntView | null);
      } catch {
        /* network blip — keep the last known state on screen */
      }
    };
    const timer = setInterval(refresh, POLL_MS);
    return () => {
      clearInterval(timer);
      controller?.abort();
    };
  }, [channel]);

  if (!hunt) return <div className="ovl-root" />;

  return (
    <div className="ovl-root">
      {view === 'bar' ? (
        <Bar hunt={hunt} />
      ) : view === 'current' ? (
        <Current hunt={hunt} fresh={fresh} />
      ) : (
        <Board hunt={hunt} rows={rows} fresh={fresh} />
      )}
    </div>
  );
}

/** Ids of bonuses whose payout arrived since the last poll, for a brief highlight. */
function useFreshBonuses(hunt: BonusHuntView | null) {
  const seen = useRef<Map<string, number | null> | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!hunt) return;
    const before = seen.current;
    seen.current = new Map(hunt.bonuses.map((b) => [b.id, b.payout]));
    // The first render is what was already there, not news.
    if (!before) return;
    const landed = hunt.bonuses.filter((b) => b.payout !== null && before.has(b.id) && before.get(b.id) === null);
    if (!landed.length) return;
    setFresh(new Set(landed.map((b) => b.id)));
    const t = setTimeout(() => setFresh(new Set()), FRESH_MS);
    return () => clearTimeout(t);
  }, [hunt]);

  return fresh;
}

/** The figures every layout shows, worked out the same way as the public board. */
function figures(hunt: BonusHuntView) {
  const { stats } = hunt;
  return {
    breakEven: stats.totalBet ? multiplier(hunt.startBalance, stats.totalBet) : '—',
    average: stats.opened ? multiplier(stats.won, stats.totalBet - stats.remainingBet) : '—',
    needed: stats.remainingBet ? multiplier(Math.max(0, hunt.startBalance - stats.won), stats.remainingBet) : '—',
    averageTone:
      stats.runningX !== null && stats.breakEvenX !== null ? (stats.runningX >= stats.breakEvenX ? 'up' : 'down') : undefined,
  } as const;
}

const STATUS: Record<string, string> = { collecting: 'Collecting', guessing: 'Guess the balance', opening: 'Opening', complete: 'Finished' };

/** The bonus the hunt is focused on: the next to open, or the latest added while collecting. */
function focusIndex(hunt: BonusHuntView) {
  const next = hunt.bonuses.findIndex((b) => b.payout === null);
  if (hunt.status === 'collecting' || hunt.status === 'guessing' || next === -1) return hunt.bonuses.length - 1;
  return next;
}

/**
 * What chat can do right now, in words viewers can copy: call slots while
 * collecting, guess while guessing, and — at the end — who won the guess.
 */
function ChatPrompt({ hunt, compact = false }: { hunt: BonusHuntView; compact?: boolean }) {
  const { gtb } = hunt;
  const count = `${gtb.guesses} ${gtb.guesses === 1 ? 'guess' : 'guesses'}`;
  switch (hunt.status) {
    case 'collecting':
      return (
        <p className="ovl-prompt">
          <span>Call a slot</span> <code>!sr slot name</code>
        </p>
      );
    case 'guessing':
      return (
        <p className="ovl-prompt ovl-prompt--gtb">
          <span>Guess the balance</span> <code>!guess amount</code>
          {compact ? null : <em>{count}</em>}
        </p>
      );
    case 'opening':
      return gtb.guesses && !compact ? (
        <p className="ovl-prompt ovl-prompt--quiet">
          <span>Guessing closed</span> {count} locked in
        </p>
      ) : null;
    default:
      return gtb.winner ? (
        <p className="ovl-prompt ovl-prompt--win">
          <span>GTB winner</span> @{gtb.winner.username} · {usd(gtb.winner.guess)}
          {compact ? null : <em>{gtb.winner.off ? `${usd(gtb.winner.off)} off` : 'spot on'}</em>}
        </p>
      ) : null;
  }
}

function Kind({ kind }: { kind: string }) {
  if (kind === 'normal') return null;
  return <span className={`ovl-kind ovl-kind--${kind}`}>{bonusKindLabel(kind)}</span>;
}

/* --------------------------------------------------------------- the board */

function Board({ hunt, rows, fresh }: { hunt: BonusHuntView; rows: number; fresh: Set<string> }) {
  const { stats } = hunt;
  const f = figures(hunt);
  const focus = focusIndex(hunt);
  // Keep the focused bonus near the top of the window, with a little context above it.
  const start = Math.max(0, Math.min(focus - 2, hunt.bonuses.length - rows));
  const shown = hunt.bonuses.slice(start, start + rows);
  const progress = stats.total ? (stats.opened / stats.total) * 100 : 0;
  const best = hunt.bonuses.find((b) => b.id === stats.bestId);
  const done = hunt.status === 'complete';

  return (
    <section className="ovl ovl--board">
      <header className="ovl-head">
        <p className="ovl-eyebrow">
          <span className={`ovl-dot ovl-dot--${hunt.status}`} /> Bonus hunt · {STATUS[hunt.status] ?? hunt.status}
        </p>
        <h1 className="ovl-title">{hunt.title}</h1>
      </header>

      <dl className="ovl-stats">
        <Figure label="Start" value={usd(hunt.startBalance)} />
        <Figure label="Break-even" value={f.breakEven} />
        <Figure label="Average" value={f.average} tone={f.averageTone} />
        {done ? (
          <Figure label="Profit" value={usd(stats.profit)} tone={stats.profit >= 0 ? 'up' : 'down'} />
        ) : (
          <Figure label="Won" value={usd(stats.won)} />
        )}
      </dl>

      <div className="ovl-progress" aria-label={`${stats.opened} of ${stats.total} opened`}>
        <span className="ovl-progress__fill" style={{ width: `${progress}%` }} />
        <span className="ovl-progress__label">
          {stats.opened}/{stats.total} opened
        </span>
      </div>

      <ChatPrompt hunt={hunt} />

      {shown.length ? (
        <ol className="ovl-list">
          {shown.map((b) => (
            <Row
              key={b.id}
              bonus={b}
              focused={b === hunt.bonuses[focus] && (hunt.status === 'opening' || hunt.status === 'collecting')}
              best={b.id === stats.bestId}
              fresh={fresh.has(b.id)}
            />
          ))}
        </ol>
      ) : (
        <p className="ovl-empty">Collecting bonuses…</p>
      )}

      {best && best.payout !== null ? (
        <footer className="ovl-foot">
          <span>Best</span> {best.game} <strong>{multiplier(best.payout, best.bet)}</strong>
        </footer>
      ) : null}
    </section>
  );
}

function Row({ bonus: b, focused, best, fresh }: { bonus: HuntBonusView; focused: boolean; best: boolean; fresh: boolean }) {
  const opened = b.payout !== null;
  const cls = ['ovl-row', opened && 'is-open', focused && 'is-focus', best && 'is-best', fresh && 'is-fresh'].filter(Boolean).join(' ');
  return (
    <li className={cls}>
      <span className="ovl-row__no">{b.position}</span>
      <span className="ovl-row__game">
        <span className="ovl-row__line">
          <span className="ovl-row__name">{b.game}</span>
          <Kind kind={b.kind} />
        </span>
        {b.calledBy ? <span className="ovl-row__by">@{b.calledBy}</span> : null}
      </span>
      <span className="ovl-row__bet">{usd(b.bet)}</span>
      <span className="ovl-row__x">{opened ? multiplier(b.payout as number, b.bet) : '—'}</span>
    </li>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  return (
    <div className={`ovl-fig${tone ? ` ovl-fig--${tone}` : ''}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/* ----------------------------------------------------------------- the bar */

function Bar({ hunt }: { hunt: BonusHuntView }) {
  const { stats } = hunt;
  const f = figures(hunt);
  const done = hunt.status === 'complete';
  const focus = hunt.bonuses[focusIndex(hunt)];

  return (
    <section className="ovl ovl--bar">
      <p className="ovl-bar__brand">
        <span className={`ovl-dot ovl-dot--${hunt.status}`} /> Bonus hunt
      </p>
      <dl className="ovl-stats ovl-stats--inline">
        <Figure label="Bonuses" value={`${stats.opened}/${stats.total}`} />
        <Figure label="Start" value={usd(hunt.startBalance)} />
        <Figure label="Break-even" value={f.breakEven} />
        <Figure label="Average" value={f.average} tone={f.averageTone} />
        {done ? (
          <Figure label="Profit" value={usd(stats.profit)} tone={stats.profit >= 0 ? 'up' : 'down'} />
        ) : (
          <Figure label="Needed" value={stats.requiredX === 0 ? 'Paid' : f.needed} tone={stats.requiredX === 0 ? 'up' : undefined} />
        )}
      </dl>
      {hunt.status === 'opening' && focus ? (
        <p className="ovl-bar__now">
          <span>Opening</span>
          {focus.game} <Kind kind={focus.kind} />
        </p>
      ) : (
        <div className="ovl-bar__now">
          <ChatPrompt hunt={hunt} compact />
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------- the current */

function Current({ hunt, fresh }: { hunt: BonusHuntView; fresh: Set<string> }) {
  const { stats } = hunt;
  const f = figures(hunt);
  const idx = focusIndex(hunt);
  const focus = hunt.bonuses[idx];
  const previous = [...hunt.bonuses].reverse().find((b) => b.payout !== null && b !== focus);
  const done = hunt.status === 'complete';

  if (done) {
    const up = stats.profit >= 0;
    return (
      <section className="ovl ovl--current">
        <p className="ovl-eyebrow">Bonus hunt finished</p>
        <p className={`ovl-current__result ${up ? 'is-up' : 'is-down'}`}>
          {up ? '+' : '−'}
          {usd(Math.abs(stats.profit))}
        </p>
        <p className="ovl-current__meta">
          {usd(stats.won)} back from {usd(hunt.startBalance)} · average {f.average}
        </p>
        <ChatPrompt hunt={hunt} />
      </section>
    );
  }

  if (hunt.status === 'guessing') {
    return (
      <section className="ovl ovl--current">
        <p className="ovl-eyebrow">Guess the balance · open</p>
        <p className="ovl-current__game">
          Type <code className="ovl-cmd">!guess amount</code>
        </p>
        <p className="ovl-current__meta">
          What will {stats.total} bonuses ({usd(stats.totalBet)} in bets) pay back? Closest wins.
        </p>
        <p className="ovl-current__prev">
          <span>So far</span> {hunt.gtb.guesses} {hunt.gtb.guesses === 1 ? 'guess' : 'guesses'}
        </p>
      </section>
    );
  }

  if (!focus) {
    return (
      <section className="ovl ovl--current">
        <p className="ovl-eyebrow">Bonus hunt</p>
        <p className="ovl-current__game">Collecting bonuses…</p>
        <ChatPrompt hunt={hunt} />
      </section>
    );
  }

  const collecting = hunt.status === 'collecting';
  return (
    <section className={`ovl ovl--current${previous && fresh.has(previous.id) ? ' is-fresh' : ''}`}>
      <p className="ovl-eyebrow">
        {collecting ? `Collecting · ${stats.total} bonuses` : `Now opening · ${focus.position} of ${stats.total}`}
      </p>
      <p className="ovl-current__game">
        {focus.game} <Kind kind={focus.kind} />
      </p>
      <p className="ovl-current__meta">
        {[focus.provider, `${usd(focus.bet)} bet`, focus.calledBy ? `called by @${focus.calledBy}` : '']
          .filter(Boolean)
          .join(' · ')}
      </p>
      {!collecting ? (
        <dl className="ovl-stats ovl-stats--inline ovl-current__stats">
          <Figure label="Average" value={f.average} tone={f.averageTone} />
          <Figure label="Needed" value={stats.requiredX === 0 ? 'Paid' : f.needed} tone={stats.requiredX === 0 ? 'up' : undefined} />
        </dl>
      ) : null}
      {previous && previous.payout !== null ? (
        <p className="ovl-current__prev">
          <span>Last</span> {previous.game} · {usd(previous.payout)} · <strong>{multiplier(previous.payout, previous.bet)}</strong>
        </p>
      ) : collecting ? (
        <ChatPrompt hunt={hunt} />
      ) : null}
    </section>
  );
}
