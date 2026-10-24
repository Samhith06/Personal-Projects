'use client';

import { useState } from 'react';

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};
const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

/**
 * Prize-per-place editor. Still posts a single comma-separated `prizes`
 * field, so the server action's parsing is unchanged.
 */
export function PrizeTable({ initial, disabled }: { initial: number[]; disabled?: boolean }) {
  const [prizes, setPrizes] = useState<string[]>(initial.map(String));
  const amounts = prizes.map((p) => Number(p) || 0);
  const total = amounts.reduce((a, b) => a + b, 0);

  const set = (i: number, v: string) => setPrizes((p) => p.map((x, j) => (j === i ? v : x)));
  const remove = (i: number) => setPrizes((p) => p.filter((_, j) => j !== i));
  const add = () => setPrizes((p) => [...p, p.at(-1) ?? '0']);

  return (
    <div className="prize-table">
      <input type="hidden" name="prizes" value={prizes.map((p) => p.trim() || '0').join(',')} />
      <div className="prize-table__head">
        <span>Place</span>
        <span>Prize</span>
        <span>Share</span>
        <span />
      </div>
      {prizes.map((p, i) => (
        <div key={i} className="prize-table__row">
          <span className="prize-table__place">{ordinal(i + 1)}</span>
          <label className="prize-table__amount">
            <span aria-hidden>$</span>
            <input
              className="input"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={p}
              onChange={(e) => set(i, e.target.value)}
              aria-label={`Prize for ${ordinal(i + 1)} place`}
              disabled={disabled}
            />
          </label>
          <span className="prize-table__share meta">{total ? `${Math.round((amounts[i] / total) * 100)}%` : '—'}</span>
          <button
            type="button"
            className="btn btn--danger-ghost prize-table__remove"
            onClick={() => remove(i)}
            disabled={disabled || prizes.length <= 1}
            aria-label={`Remove ${ordinal(i + 1)} place`}
          >
            ✕
          </button>
        </div>
      ))}
      <div className="prize-table__foot">
        <button type="button" className="btn btn--secondary" onClick={add} disabled={disabled || prizes.length >= 100}>
          + Add place
        </button>
        <span>
          <span className="meta">{prizes.length} paid places · pool </span>
          <strong className="num">{usd(total)}</strong>
        </span>
      </div>
    </div>
  );
}
