import { saveLeaderboard } from '@/server/actions/admin';
import type { Leaderboard } from '@/server/services/leaderboards';
import { PrizeTable } from './PrizeTable';

const day = (d: Date) => d.toISOString().slice(0, 10);

function thisMonth() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return { start, end, name: start.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) };
}

/** Create (no board) or edit a leaderboard. Dates are whole UTC days. */
export function LeaderboardForm({ board }: { board?: Leaderboard }) {
  const month = thisMonth();
  const locked = board ? board.status === 'frozen' || board.status === 'published' : false;
  return (
    <form action={saveLeaderboard} className="stack" style={{ gap: 14 }}>
      {board ? <input type="hidden" name="id" value={board.id} /> : null}
      <fieldset disabled={locked} className="stack" style={{ gap: 14, border: 0, padding: 0, margin: 0 }}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="lb-name">Name</label>
            <input id="lb-name" name="name" className="input" defaultValue={board?.name ?? month.name} required />
          </div>
          <div className="field">
            <label htmlFor="lb-start">Start (UTC day)</label>
            <input id="lb-start" name="startDay" type="date" className="input" defaultValue={day(board?.startsAt ?? month.start)} required />
          </div>
          <div className="field">
            <label htmlFor="lb-end">End (UTC day, inclusive)</label>
            <input id="lb-end" name="endDay" type="date" className="input" defaultValue={day(board?.endsAt ?? month.end)} required />
          </div>
          <div className="field">
            <label htmlFor="lb-metric">Rank by</label>
            <select id="lb-metric" name="metric" className="input" defaultValue={board?.metric ?? 'weighted'}>
              <option value="wagered">Total wagered</option>
              <option value="weighted">Weighted wagered</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="lb-min">Minimum wager to place ($)</label>
            <input id="lb-min" name="minWager" type="number" min="0" step="1" className="input" defaultValue={board?.minWager ?? 0} />
          </div>
        </div>
        <div className="field">
          <label>Prizes by place</label>
          <PrizeTable initial={board?.prizes ?? [1200, 700, 400, 250, 150, 60, 60, 60, 60, 60]} disabled={locked} />
        </div>
        <p className="meta">Player names are always shown masked on the public board (first two letters, **, then the last three, e.g. Ma**ins).</p>
        <div>
          <button className="btn btn--primary" type="submit">
            {board ? 'Save changes' : 'Create leaderboard'}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
