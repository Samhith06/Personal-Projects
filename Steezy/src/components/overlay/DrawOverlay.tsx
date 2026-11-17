'use client';

import { useEffect, useRef, useState } from 'react';
import type { OverlayState } from '@/server/services/overlay';

const POLL_MS = 2000;
/** A draw younger than this plays the reel when the overlay sees it; older ones go straight to the winner card. */
const ANIMATE_WITHIN_MS = 90_000;
const REEL_MS = 6500;
/** How long the winner card stays up before the overlay clears itself. */
const WINNER_MS = 30_000;

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

/** Winner name size that keeps long names inside the fixed frame. */
const winnerSize = (name: string) => (name.length <= 9 ? 104 : name.length <= 14 ? 80 : name.length <= 20 ? 60 : 46);

/** Rows that fit the join list's fixed area; longer lists scroll. */
const VISIBLE_ROWS = 7;
/** Scroll speed: seconds per name, so long lists still crawl slowly enough to read. */
const SECONDS_PER_NAME = 1.8;

/**
 * Everyone who joined, newest first. A short list just sits there; a longer
 * one scrolls slowly upward in a loop (the names are rendered twice so the
 * wrap-around is seamless).
 */
function JoinList({ names, waiting }: { names: string[]; waiting: string }) {
  if (!names.length) return <div className="ov-list ov-list--empty">{waiting}</div>;
  if (names.length <= VISIBLE_ROWS) {
    return (
      <ul className="ov-list ov-recent">
        {names.map((name, i) => (
          <li key={`${name}-${i}`}>{name}</li>
        ))}
      </ul>
    );
  }
  return (
    <div className="ov-list ov-scroll">
      <ul className="ov-recent ov-scroll__track" style={{ animationDuration: `${names.length * SECONDS_PER_NAME}s` }}>
        {[...names, ...names].map((name, i) => (
          <li key={i} aria-hidden={i >= names.length || undefined}>
            {name}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The 1920×1080 OBS browser source for a giveaway or raffle. Every state
 * (entries, closed, reel, winner) sits in the same fixed 720×760 frame in the
 * middle, so the source never grows, shrinks or shifts as people join.
 *   open   → entry panel (keyword, timer, live count, newest joins)
 *   closed → "entries closed" panel
 *   drawn  → name reel that slows to a stop on the winner, then the winner card for 30 s, then nothing
 * The permanent link (kind `live`) follows whichever giveaway is running and is `idle`, drawing nothing, in between.
 * `?preview=1` paints a dark stand-in for the stream so the layout is visible in a browser.
 */
export function DrawOverlay({ kind, token, initial, preview }: { kind: string; token: string; initial: OverlayState; preview: boolean }) {
  const [state, setState] = useState(initial);
  const [reelName, setReelName] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(
    () => initial.status === 'drawn' && (!initial.drawnAt || Date.now() - new Date(initial.drawnAt).getTime() > ANIMATE_WITHIN_MS),
  );
  const played = useRef<string | null>(revealed ? initial.drawnAt : null);
  // Once the giveaway is over the overlay shows nothing: a draw that was already done when OBS loaded starts hidden.
  const [finished, setFinished] = useState(revealed);
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
    setFinished(false);
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

  // The permanent link moves on to the next giveaway, which starts from a clean slate.
  useEffect(() => {
    if (state.status === 'drawn') return;
    setRevealed(false);
    setFinished(false);
  }, [state.status]);

  // Clear the winner card WINNER_MS after it's revealed.
  useEffect(() => {
    if (state.status !== 'drawn' || !revealed || finished) return;
    const t = setTimeout(() => setFinished(true), WINNER_MS);
    return () => clearTimeout(t);
  }, [state.status, revealed, finished]);

  const drawing = reelName !== null;

  return (
    <div className={`ov ov--draw${preview ? ' ov--preview' : ''}`}>
      {preview ? <div className="ov__stand-in">Stream gameplay · transparent in OBS</div> : null}

      {state.status === 'open' && !drawing ? (
        <section className="ov-panel ov-frame">
          <header className="ov-panel__head">
            <span className="ov-eyebrow">
              <span className="ov-dot" />
              {state.kind === 'raffle' ? 'Raffle open' : 'Giveaway live'}
            </span>
            <h1>{state.title}</h1>
          </header>
          <div className="ov-panel__body">
            <div className="ov-call">
              {countdown ? (
                <>
                  <span className="ov-call__label" suppressHydrationWarning>
                    {state.kind === 'raffle' ? 'Raffle closes in' : countdown === '00:00' ? 'Drawing now…' : 'Giveaway draws in'}
                  </span>
                  {/* The server's second and the browser's can differ by one; the next tick settles it. */}
                  <b className="ov-call__clock" suppressHydrationWarning>
                    {countdown}
                  </b>
                </>
              ) : (
                <span className="ov-call__label">{state.kind === 'raffle' ? 'Raffle open' : 'Draw coming up soon'}</span>
              )}
              <span className="ov-call__how">
                {state.keyword ? (
                  <>
                    Type <b>{state.keyword}</b> in the Kick chat to enter
                  </>
                ) : state.kind === 'raffle' ? (
                  '1 ticket per $1k wagered · code STZY'
                ) : (
                  'Enter on SteezySpins.com'
                )}
              </span>
            </div>
            <div className="ov-count ov-count--row">
              <span>{state.entriesLabel}</span>
              <b>{state.entries.toLocaleString('en-US')}</b>
            </div>
            {state.kind === 'raffle' && state.prizes.length > 1 ? <div className="ov-prizes">{state.prizes.join('   ·   ')}</div> : null}
            <JoinList names={state.recent} waiting={state.keyword ? `Be the first: type ${state.keyword} in chat` : 'Waiting for the first entry…'} />
          </div>
        </section>
      ) : null}

      {state.status === 'closed' ? (
        <section className="ov-panel ov-frame">
          <header className="ov-panel__head">
            <span className="ov-eyebrow">Entries closed</span>
            <h1>{state.title}</h1>
          </header>
          <div className="ov-panel__body">
            <div className="ov-count">
              <span>{state.entriesLabel}</span>
              <b>{state.entries.toLocaleString('en-US')}</b>
            </div>
            <div className="ov-call">
              <span className="ov-call__label">Entries closed</span>
              <b className="ov-call__clock ov-call__clock--text">Drawing in a moment…</b>
            </div>
          </div>
        </section>
      ) : null}

      {drawing ? (
        <section className="ov-center ov-frame ov-reel" aria-live="polite">
          <span className="ov-eyebrow">
            Drawing · {state.players.toLocaleString('en-US')} {state.kind === 'raffle' ? 'players' : 'entries'}
          </span>
          <div className="ov-reel__name">{reelName}</div>
        </section>
      ) : null}

      {state.status === 'drawn' && revealed && !finished && !drawing ? (
        <section className="ov-center ov-frame ov-winner" aria-live="polite">
          <span className="ov-eyebrow">{state.winners.length > 1 ? 'Winners' : 'Winner'}</span>
          {state.winners.length ? (
            <>
              <div className="ov-winner__name" style={{ fontSize: winnerSize(state.winners[0].name) }}>
                {state.winners[0].name}
              </div>
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
              <div className="ov-winner__fair">Provably fair · verify on SteezySpins /fair</div>
            </>
          ) : (
            <div className="ov-winner__prize">No entries</div>
          )}
        </section>
      ) : null}

      {finished || state.status === 'idle' ? null : (
        <div className="ov-brand">
          <span className="ov-dot" />
          SteezySpins <span>· code</span> <i>STZY</i>
        </div>
      )}
    </div>
  );
}
