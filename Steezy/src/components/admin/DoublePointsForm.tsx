'use client';

import { useState } from 'react';
import { turnOnDoublePoints } from '@/server/actions/boosts';

const LENGTHS: [string, string][] = [
  ['30', '30 minutes'],
  ['60', '1 hour'],
  ['120', '2 hours'],
  ['180', '3 hours'],
  ['360', '6 hours'],
  ['720', '12 hours'],
  ['1440', '24 hours'],
  ['open', 'Until I turn it off'],
];

/** The picker's value in the admin's own time zone, sent to the server as an exact instant. */
function toIso(local: string) {
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

export function DoublePointsForm() {
  const [when, setWhen] = useState<'now' | 'later'>('now');
  const [local, setLocal] = useState('');

  return (
    <form action={turnOnDoublePoints} className="stack" style={{ gap: 14 }}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="dp-mult">Points</label>
          <select id="dp-mult" name="multiplier" className="input" defaultValue="2">
            <option value="2">2× (double)</option>
            <option value="1.5">1.5×</option>
            <option value="3">3× (triple)</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="dp-len">How long</label>
          <select id="dp-len" name="duration" className="input" defaultValue="60">
            {LENGTHS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="dp-when">Starts</label>
          <select id="dp-when" name="when" className="input" value={when} onChange={(e) => setWhen(e.target.value as 'now' | 'later')}>
            <option value="now">Right now</option>
            <option value="later">At a set time…</option>
          </select>
        </div>
        {when === 'later' ? (
          <div className="field">
            <label htmlFor="dp-at">Start time (your time)</label>
            <input id="dp-at" type="datetime-local" className="input" value={local} onChange={(e) => setLocal(e.target.value)} required />
            <input type="hidden" name="startsAtIso" value={toIso(local)} />
          </div>
        ) : null}
      </div>
      <div>
        <button className="btn btn--primary" type="submit">
          {when === 'later' ? 'Schedule double points' : 'Turn on double points'}
        </button>
      </div>
    </form>
  );
}
