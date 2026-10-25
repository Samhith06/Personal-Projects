'use client';

import { useEffect, useRef, useState } from 'react';
import type { HuntOverlayState } from '@/server/services/hunt-overlay';

const POLL_MS = 3000;
const money = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const money2 = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const multi = (n: number) => `${n.toLocaleString('en-US', { maximumFractionDigits: 1 })}×`;
const MEDAL = ['var(--medal-gold)', 'var(--medal-silver)', 'var(--medal-bronze)'];

/**
 * 1920×1080 OBS browser source for bonus hunts (canvas design "OBS — bonus hunt + leaderboard"):
 * left panel with the hunt and its slot list (the slot being opened is highlighted and kept in view),
 * a guess-the-balance box top right, and the wager leaderboard ticker along the bottom.
 */
export function HuntOverlay({ token, initial, preview }: { token: string; initial: HuntOverlayState; preview: boolean }) {
  const [state, setState] = useState(initial);
  const currentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/overlay/hunt/${token}`, { cache: 'no-store' });
        if (res.ok) setState(await res.json());
      } catch {
        // Keep the last state until the next poll.
      }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [token]);

  const currentId = state.hunt?.slots.find((s) => s.current)?.id;
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [currentId]);

  const h = state.hunt;

  return (
    <div className={`ov${preview ? ' ov--preview' : ''}`}>
      {preview ? <div className="ov__stand-in" style={{ left: 520 }}>Slot gameplay · transparent in OBS</div> : null}

      {h ? (
        <section className="hov-panel">
          <header className="hov-panel__head">
            <div className="hov-row">
              <span className="ov-eyebrow">{h.title}</span>
              <span className="hov-status">{h.status === 'opening' ? 'Opening' : h.status === 'finished' ? 'Finished' : 'Collecting'}</span>
            </div>
            <div className="hov-stats">
              <div>
                <span>Start</span>
                <b>{money(h.startCost)}</b>
              </div>
              <div>
                <span>Won so far</span>
                <b style={{ color: h.won >= h.startCost ? 'var(--color-accent-400)' : undefined }}>{money(h.won)}</b>
              </div>
              <div>
                <span>Opened</span>
                <b>
                  {h.opened} / {h.total}
                </b>
              </div>
            </div>
          </header>
          <div className="hov-mini">
            <div>
              <span>Best multi</span>
              <b style={{ color: 'var(--color-accent)' }}>{h.best ? multi(h.best) : '—'}</b>
            </div>
            <div>
              <span>Avg needed</span>
              <b>{h.avgNeeded ? multi(h.avgNeeded) : '—'}</b>
            </div>
          </div>
          <div className="hov-slots">
            {h.slots.map((s, i) => (
              <div key={s.id} ref={s.current ? currentRef : undefined} className={`hov-slot${s.current ? ' is-current' : ''}${s.opened ? ' is-opened' : ''}`}>
                <span className="hov-slot__n">{i + 1}</span>
                <span className="hov-slot__name">{s.name}</span>
                <span className="hov-slot__bet">{s.bet ? money2(s.bet) : ''}</span>
                <span className="hov-slot__res">{s.current ? 'Now' : s.opened ? multi(s.multi ?? 0) : '—'}</span>
              </div>
            ))}
          </div>
          <div className="hov-foot">Data from bonushunt.gg</div>
        </section>
      ) : null}

      {/* Guess box: one look per phase. Hidden at the end, when the results card takes over. */}
      {h && h.status !== 'finished' ? (
        <section className={`hov-guess${state.guess.open ? ' is-open' : ''}`} key={`${h.status}-${state.guess.open}`}>
          <span className="ov-eyebrow">
            Guess the balance · {state.guess.open ? 'open' : h.status === 'opening' ? 'opening' : 'locked'}
          </span>
          {state.guess.open ? (
            <>
              <div className="hov-guess__big">
                Type <b style={{ color: 'var(--color-accent)' }}>!guess 4200</b>
              </div>
              <span className="hov-guess__sub">
                <b>{state.guess.count}</b> guess{state.guess.count === 1 ? '' : 'es'} · closes when the opening starts
              </span>
            </>
          ) : h.status === 'opening' && state.guess.leader ? (
            <>
              <div className="hov-guess__big">
                Closest now: <b style={{ color: 'var(--color-accent)' }}>{state.guess.leader.name}</b>
              </div>
              <span className="hov-guess__sub">
                Guessed {money(state.guess.leader.amount)} · balance {money(h.won)} · <b>{state.guess.count}</b> guesses
              </span>
            </>
          ) : (
            <>
              <div className="hov-guess__big">Guesses locked</div>
              <span className="hov-guess__sub">
                <b>{state.guess.count}</b> guess{state.guess.count === 1 ? '' : 'es'} in
              </span>
            </>
          )}
        </section>
      ) : null}

      {/* Ending phase: results card. */}
      {h && h.status === 'finished' ? (
        <section className="hov-result">
          <span className="ov-eyebrow">{h.title} · final</span>
          <div className="hov-result__grid">
            <div>
              <span>Start</span>
              <b>{money(h.startCost)}</b>
            </div>
            <div>
              <span>Final balance</span>
              <b style={{ color: h.won >= h.startCost ? 'var(--color-accent)' : 'var(--color-danger)' }}>{money2(h.won)}</b>
            </div>
            <div>
              <span>{h.won >= h.startCost ? 'Profit' : 'Loss'}</span>
              <b style={{ color: h.won >= h.startCost ? 'var(--color-accent)' : 'var(--color-danger)' }}>
                {h.won >= h.startCost ? '+' : '−'}
                {money(Math.abs(h.won - h.startCost))}
              </b>
            </div>
          </div>
          {h.bestSlot ? (
            <div className="hov-result__best">
              Best slot <b>{h.bestSlot.name}</b> <span>{multi(h.bestSlot.multi)}</span>
            </div>
          ) : null}
          <div className="hov-result__gtb">
            {state.guess.winner ? (
              <>
                Guess the balance winner <b>{state.guess.winner}</b>
                {state.guess.winnerGuess !== null ? <span> guessed {money2(state.guess.winnerGuess)}</span> : null}
              </>
            ) : (
              <>No guesses this hunt</>
            )}
          </div>
        </section>
      ) : null}

      <div className="hov-ticker">
        <span className="hov-ticker__brand">
          <span className="ov-dot" />
          SteezySpins
        </span>
        {state.boardName ? <span className="hov-ticker__label">{state.boardName} leaderboard</span> : null}
        {state.ticker.map((t) => (
          <span key={t.rank} className="hov-ticker__item">
            <b style={{ color: MEDAL[t.rank - 1] ?? 'var(--color-text)' }}>#{t.rank}</b> {t.name} <span>{money(t.wagered)}</span>
          </span>
        ))}
        <span className="hov-ticker__code">
          Code <i>STZY</i> on Roobet
        </span>
      </div>
    </div>
  );
}
