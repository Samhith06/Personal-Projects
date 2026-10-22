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

      {h ? (
        <section className="hov-guess">
          <span className="ov-eyebrow">Guess the balance</span>
          {state.guess.winner ? (
            <div className="hov-guess__big">
              Closest: <b style={{ color: 'var(--color-accent)' }}>{state.guess.winner}</b>
            </div>
          ) : state.guess.open ? (
            <div className="hov-guess__big">
              Type <b style={{ color: 'var(--color-accent)' }}>!guess 4200</b>
            </div>
          ) : (
            <div className="hov-guess__big">Guesses locked</div>
          )}
          <span className="hov-guess__sub">
            <b>{state.guess.count}</b> guess{state.guess.count === 1 ? '' : 'es'}
            {state.guess.open ? ' · closes when the opening starts' : ''}
          </span>
        </section>
      ) : null}

      <div className="hov-ticker">
        <span className="hov-ticker__brand">
          <span className="ov-dot" />
          SteezeSpins
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
