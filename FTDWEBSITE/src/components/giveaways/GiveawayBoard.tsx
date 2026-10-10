'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Medallion } from '@/components/ui/primitives';
import { relativeTime, usd } from '@/lib/format';
import { giveawayKindLabel } from '@/lib/giveaways';

export type GiveawayWinner = {
  id: string;
  handle: string;
  amount: number;
  kind: string;
  note: string | null;
  /** ISO timestamp — serialisable across the server/client boundary. */
  occurredAt: string;
  streamerName: string | null;
  monogram: string;
  accent: string;
  avatarUrl: string | null;
};

/* ------------------------------------------------------------ Total counter */

/**
 * The headline figure, counted up once on entry.
 *
 * It renders the final number on the server and in the markup, so the real
 * total is what a crawler, a screenshot or a reduced-motion visitor sees — the
 * animation only ever plays on top of a value that is already correct.
 */
export function GiveawayTotal({ total }: { total: number }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [shown, setShown] = useState(total);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setShown(total);
    if (!('IntersectionObserver' in window)) return setShown(total);

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const started = performance.now();
        const duration = 1400;
        const tick = (now: number) => {
          const t = Math.min(1, (now - started) / duration);
          // Ease-out cubic: fast start, gentle landing on the real number.
          setShown(total * (1 - Math.pow(1 - t, 3)));
          if (t < 1) requestAnimationFrame(tick);
          else setShown(total);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [total]);

  return (
    <p className="gv-total__value tabular" ref={ref} aria-label={`${usd(total)} given away in total`}>
      <span aria-hidden="true">{usd(Math.round(shown) === Math.round(total) ? total : Math.round(shown))}</span>
    </p>
  );
}

/* ---------------------------------------------------------------- Slider */

/**
 * The "last winners" slide bar.
 *
 * A plain horizontally-scrolling list: it works with a swipe, a trackpad, the
 * arrow buttons or the keyboard, and it degrades to a scrollable row with no
 * JavaScript at all. The arrows page by one card's width.
 */
export function WinnerSlider({ winners }: { winners: GiveawayWinner[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    sync();
    const el = trackRef.current;
    if (!el) return;
    const onResize = () => sync();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [sync, winners.length]);

  /**
   * Page by exactly one card.
   *
   * The position is assigned rather than animated with `scrollBy`: a smooth
   * programmatic scroll is something a browser is free to ignore — a snapping
   * container or reduced-motion settings will drop it, and then the arrows do
   * nothing at all. Setting the offset always moves the slider, and CSS
   * `scroll-behavior` animates it wherever that is honoured.
   */
  const page = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const cards = [...el.querySelectorAll<HTMLLIElement>('li')];
    if (!cards.length) return;

    const current = el.scrollLeft;
    const target =
      direction === 1
        ? cards.find((c) => c.offsetLeft > current + 4)
        : [...cards].reverse().find((c) => c.offsetLeft < current - 4);

    const max = el.scrollWidth - el.clientWidth;
    el.scrollLeft = Math.max(0, Math.min(target ? target.offsetLeft : direction === 1 ? max : 0, max));
    sync();
  };

  if (!winners.length) return <p className="muted">No giveaways logged yet — the first one lands on stream.</p>;

  return (
    <div className="gv-slider">
      <ul className="gv-slider__track" ref={trackRef} onScroll={sync} tabIndex={0} aria-label="Most recent giveaway winners">
        {winners.map((w, i) => (
          <li key={w.id} className="gv-win">
            <span className="gv-win__index tabular" aria-hidden="true">
              {i + 1}
            </span>
            <Medallion monogram={w.monogram} imageUrl={w.avatarUrl} accent={w.accent} size="sm" />
            <div className="gv-win__body">
              <p className="gv-win__handle">{w.handle}</p>
              <p className="gv-win__meta">
                {giveawayKindLabel(w.kind)}
                {w.streamerName ? ` · ${w.streamerName}` : ''}
              </p>
              {w.note ? <p className="gv-win__note">{w.note}</p> : null}
              <p className="gv-win__when">{relativeTime(w.occurredAt)}</p>
            </div>
            <span className="gv-win__amount tabular">{usd(w.amount)}</span>
          </li>
        ))}
      </ul>

      <div className="gv-slider__nav">
        <button type="button" className="icon-btn" onClick={() => page(-1)} disabled={atStart}>
          <Icon name="chevron-left" />
          <span className="sr-only">Previous winners</span>
        </button>
        <button type="button" className="icon-btn" onClick={() => page(1)} disabled={atEnd}>
          <Icon name="chevron-right" />
          <span className="sr-only">More winners</span>
        </button>
      </div>
    </div>
  );
}
