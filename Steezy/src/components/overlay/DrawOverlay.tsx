'use client';

import { useEffect, useRef, useState } from 'react';
import type { OverlayState } from '@/server/services/overlay';

const POLL_MS = 2000;
/** A draw younger than this plays the reel when the overlay sees it; older ones go straight to the winner card. */
const ANIMATE_WITHIN_MS = 90_000;
const REEL_MS = 6500;

function useCountdown(iso: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!iso) return null;
  const s = Math.max(0, Math.floor((new Date(iso).getTime() - now) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/**
 * The 1920×1080 OBS browser source for a giveaway or raffle.
 *   open   → entry panel (keyword, timer, live count, newest joins)
 *   closed → "entries closed" panel
 *   drawn  → name reel that slows to a stop on the winner, then the winner card
 * `?preview=1` paints a dark stand-in for the stream so the layout is visible in a browser.
 */
export function DrawOverlay({ kind, token, initial, preview }: { kind: string; token: string; initial: OverlayState; preview: boolean }) {
  const [state, setState] = useState(initial);
  const [reelName, setReelName] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(
    () => initial.status === 'drawn' && (!initial.drawnAt || Date.now() - new Date(initial.drawnAt).getTime() > ANIMATE_WITHIN_MS),
  );
  const played = useRef<string | null>(revealed ? initial.drawnAt : null);
  const countdown = useCountdown(state.status === 'open' ? state.closesAt : null);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/overlay/${kind}/${token}`, { cache: 'no-store' });
        if (res.ok && !stop) setState(await res.json());
      } catch {
        // Keep showing the last state; the next poll will catch up.
      }
    };
    const t = setInterval(tick, POLL_MS);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [kind, token]);

  // Latest state for the reel without restarting it on every poll.
  const latest = useRef(state);
  latest.current = state;

  // Play the reel once per draw. Keyed on the draw time only, so polls during the animation don't cancel it.
  useEffect(() => {
    const s = latest.current;
    if (s.status !== 'drawn' || !s.drawnAt || played.current === s.drawnAt) return;
    played.current = s.drawnAt;
    const winner = s.winners[0]?.name ?? null;
    const pool = s.reel.length ? s.reel : winner ? [winner] : [];
    if (!winner || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRevealed(true);
      return;
    }
    setRevealed(false);
    const start = performance.now();
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      const t = (performance.now() - start) / REEL_MS;
      if (t >= 1) {
        setReelName(winner);
        timer = setTimeout(() => {
          setReelName(null);
          setRevealed(true);
        }, 900);
        return;
      }
      setReelName(pool[i++ % pool.length]);
      // Ease out: 50 ms between names at the start, ~450 ms at the end.
      timer = setTimeout(step, 50 + 400 * t * t);
    };
    step();
    return () => clearTimeout(timer);
  }, [state.status, state.drawnAt]);

  const drawing = reelName !== null;

  return (
    <div className={`ov${preview ? ' ov--preview' : ''}`}>
      {preview ? <div className="ov__stand-in">Stream gameplay · transparent in OBS</div> : null}

      {state.status === 'open' && !drawing ? (
        <section className="ov-panel">
          <header className="ov-panel__head">
            <span className="ov-eyebrow">
              <span className="ov-dot" />
              {state.kind === 'raffle' ? 'Raffle open' : 'Giveaway live'}
            </span>
            <h1>{state.title}</h1>
          </header>
          <div className="ov-panel__body">
            <div className="ov-row">
              {state.keyword ? (
                <div className="ov-join">
                  Type <b>{state.keyword}</b> in chat
                </div>
              ) : (
                <div className="ov-join">{state.kind === 'raffle' ? '1 ticket per $1k wagered · code STZY' : 'Enter on SteezySpins'}</div>
              )}
              {countdown ? (
                <div className="ov-timer">
                  <span>Closes in</span>
                  <b>{countdown}</b>
                </div>
              ) : null}
            </div>
            <div className="ov-count">
              <span>{state.entriesLabel}</span>
              <b>{state.entries.toLocaleString('en-US')}</b>
            </div>
            {state.kind === 'raffle' && state.prizes.length > 1 ? <div className="ov-prizes">{state.prizes.join('   ·   ')}</div> : null}
            <ul className="ov-recent">
              {state.recent.map((name, i) => (
                <li key={`${name}-${i}`} style={{ opacity: 1 - i * 0.18 }}>
                  {name}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {state.status === 'closed' ? (
        <section className="ov-panel">
          <header className="ov-panel__head">
            <span className="ov-eyebrow">Entries closed</span>
            <h1>{state.title}</h1>
          </header>
          <div className="ov-panel__body">
            <div className="ov-count">
              <span>{state.entriesLabel}</span>
              <b>{state.entries.toLocaleString('en-US')}</b>
            </div>
            <div className="ov-join">Drawing live in a moment…</div>
          </div>
        </section>
      ) : null}

      {drawing ? (
        <section className="ov-center ov-reel" aria-live="polite">
          <span className="ov-eyebrow">
            Drawing · {state.players.toLocaleString('en-US')} {state.kind === 'raffle' ? 'players' : 'entries'}
          </span>
          <div className="ov-reel__name">{reelName}</div>
        </section>
      ) : null}

      {state.status === 'drawn' && revealed && !drawing ? (
        <section className="ov-center ov-winner" aria-live="polite">
          <span className="ov-eyebrow">{state.winners.length > 1 ? 'Winners' : 'Winner'}</span>
          {state.winners.length ? (
            <>
              <div className="ov-winner__name">{state.winners[0].name}</div>
              <div className="ov-winner__prize">{state.winners[0].prize}</div>
              {state.winners.length > 1 ? (
                <div className="ov-winner__more">
                  {state.winners.slice(1).map((w) => (
                    <span key={w.name + w.prize}>
                      {w.prize} · <b>{w.name}</b>
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="ov-winner__fair">Provably fair · verify at steezespins/fair</div>
            </>
          ) : (
            <div className="ov-winner__prize">No entries</div>
          )}
        </section>
      ) : null}

      <div className="ov-brand">
        <span className="ov-dot" />
        SteezySpins <span>· code</span> <i>STZY</i>
      </div>
    </div>
  );
}
