'use client';

import { useEffect, useState } from 'react';
import { addWeeklyDoublePoints } from '@/server/actions/boosts';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const LENGTHS: [string, string][] = [
  ['30', '30 minutes'],
  ['60', '1 hour'],
  ['90', '1.5 hours'],
  ['120', '2 hours'],
  ['180', '3 hours'],
  ['240', '4 hours'],
  ['360', '6 hours'],
];

/** Add a repeating window. The day and time are in the admin's own time zone, which is sent along. */
export function WeeklyDoublePointsForm() {
  const [tz, setTz] = useState('');
  useEffect(() => setTz(Intl.DateTimeFormat().resolvedOptions().timeZone), []);

  return (
    <form action={addWeeklyDoublePoints} className="stack" style={{ gap: 14 }}>
      <input type="hidden" name="timeZone" value={tz} />
      <div className="form-grid">
        <div className="field">
          <label htmlFor="wk-day">Every</label>
          <select id="wk-day" name="weekday" className="input" defaultValue="5">
            {DAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="wk-time">Starting at{tz ? ` (${tz})` : ''}</label>
          <input id="wk-time" name="time" type="time" className="input" defaultValue="20:00" required />
        </div>
        <div className="field">
          <label htmlFor="wk-len">For</label>
          <select id="wk-len" name="duration" className="input" defaultValue="120">
            {LENGTHS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="wk-mult">Points</label>
          <select id="wk-mult" name="multiplier" className="input" defaultValue="2">
            <option value="2">2× (double)</option>
            <option value="1.5">1.5×</option>
            <option value="3">3× (triple)</option>
          </select>
        </div>
      </div>
      <div>
        <button className="btn btn--secondary" type="submit">
          Add weekly window
        </button>
      </div>
    </form>
  );
}
