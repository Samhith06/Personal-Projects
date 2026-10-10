'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { bonusKindLabel } from '@/lib/bonus-hunt';
import { multiplier, usd } from '@/lib/format';
import type { BonusHuntView } from '@/lib/types';

/** Fast enough to feel live, slow enough that a long hunt is not a DDoS. */
const POLL_MS = 15_000;

/**
 * The live bonus hunt board.
 *
 * Seeded by the server render so the first paint is already correct, then
 * refreshed from `/api/bonus-hunt` while the tab is visible — the same shape
 * the live-status badge uses. A hunt that finishes while someone is watching
 * simply stops changing; it is not swapped out from under them.
 */
export function HuntBoard({ initial }: { initial: BonusHuntView }) {
  const [hunt, setHunt] = useState(initial);

  useEffect(() => {
    // A finished hunt has nothing left to say.
    if (hunt.status === 'complete') return;

    let timer: ReturnType<typeof setInterval> | undefined;
    let controller: AbortController | undefined;

    const refresh = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const res = await fetch('/api/bonus-hunt', {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) return;
        const next = (await res.json()) as BonusHuntView | null;
        // Keep showing this hunt if the active one has moved on to another.
        if (next && next.id === hunt.id) setHunt(next);
      } catch {
        /* network blip — keep the last known board */
      }
    };

    const start = () => {
      clearInterval(timer);
      timer = setInterval(refresh, POLL_MS);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refresh();
        start();
      } else {
        clearInterval(timer);
      }
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(timer);
      controller?.abort();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [hunt.id, hunt.status]);

  const { stats } = hunt;
  const done = hunt.status === 'complete';
  const inProfit = stats.profit >= 0;

  return (
    <div className="hunt">
      <ChatNote hunt={hunt} />
      <div className="hunt__stats">
        <Stat label="Bonuses" value={`${stats.opened}/${stats.total}`} hint={stats.remaining ? `${stats.remaining} to open` : 'all opened'} />
        <Stat label="Start" value={usd(hunt.startBalance)} hint={`${usd(stats.totalBet)} in bets`} />
        <Stat
          label="Break-even"
          value={stats.breakEvenX === null ? '—' : multiplier(hunt.startBalance, stats.totalBet)}
          hint="average needed"
        />
        <Stat
          label="Running"
          value={stats.runningX === null ? '—' : multiplier(stats.won, stats.totalBet - stats.remainingBet)}
          hint={stats.opened ? `${usd(stats.won)} so far` : 'nothing opened yet'}
          tone={stats.runningX !== null && stats.breakEvenX !== null ? (stats.runningX >= stats.breakEvenX ? 'up' : 'down') : undefined}
        />
        {done ? (
          <Stat label="Profit" value={usd(stats.profit)} hint="final" tone={inProfit ? 'up' : 'down'} />
        ) : (
          <Stat
            label="Needed"
            value={stats.requiredX === null ? '—' : multiplier(Math.max(0, hunt.startBalance - stats.won), stats.remainingBet)}
            hint={stats.requiredX === 0 ? 'already paid for itself' : 'from the rest'}
            tone={stats.requiredX === 0 ? 'up' : undefined}
          />
        )}
      </div>

      <ol className="hunt__list">
        {hunt.bonuses.map((b) => {
          const opened = b.payout !== null;
          const isBest = b.id === stats.bestId;
          return (
            <li key={b.id} className={`hunt-row${opened ? ' is-open' : ''}${isBest ? ' is-best' : ''}`}>
              <span className="hunt-row__no">{b.position}</span>
              <span className="hunt-row__game">
                <span className="hunt-row__name">
                  {b.game}
                  {b.kind !== 'normal' ? (
                    <span className={`tag hunt-row__kind ${b.kind === 'super' ? 'tag--gold' : 'tag--cyan'}`}>
                      {bonusKindLabel(b.kind)}
                    </span>
                  ) : null}
                </span>
                {b.provider || b.calledBy ? (
                  <span className="hunt-row__provider">
                    {[b.provider, b.calledBy ? `called by @${b.calledBy}` : ''].filter(Boolean).join(' · ')}
                  </span>
                ) : null}
              </span>
              <span className="hunt-row__bet">{usd(b.bet)}</span>
              <span className="hunt-row__payout">{opened ? usd(b.payout as number) : '—'}</span>
              <span className="hunt-row__x">
                {opened ? multiplier(b.payout as number, b.bet) : '—'}
                {isBest ? <Icon name="trophy" /> : null}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** What chat can do at this step of the hunt, or who won the guess once it's over. */
function ChatNote({ hunt }: { hunt: BonusHuntView }) {
  const { gtb } = hunt;
  if (hunt.status === 'collecting') {
    return (
      <p className="hunt-note">
        Call a slot in Kick chat with <code>!sr slot name</code>
      </p>
    );
  }
  if (hunt.status === 'guessing') {
    return (
      <p className="hunt-note hunt-note--gold">
        Guess the balance is open: type <code>!guess amount</code> in Kick chat · {gtb.guesses}{' '}
        {gtb.guesses === 1 ? 'guess' : 'guesses'} so far
      </p>
    );
  }
  if (hunt.status === 'complete' && gtb.winner) {
    return (
      <p className="hunt-note hunt-note--gold">
        <Icon name="trophy" /> Guess the balance: <strong>@{gtb.winner.username}</strong> won with {usd(gtb.winner.guess)} (
        {gtb.winner.off ? `${usd(gtb.winner.off)} off` : 'spot on'})
      </p>
    );
  }
  return null;
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'up' | 'down' }) {
  return (
    <div className={`hunt-stat${tone ? ` hunt-stat--${tone}` : ''}`}>
      <p className="hunt-stat__label">{label}</p>
      <p className="hunt-stat__value">{value}</p>
      {hint ? <p className="hunt-stat__hint">{hint}</p> : null}
    </div>
  );
}
