import { saveGiveaway, saveRaffle } from '@/server/actions/draws';
import type { Giveaway, Eligibility } from '@/server/services/giveaways';
import type { Raffle } from '@/server/services/raffles';

const day = (d: Date) => d.toISOString().slice(0, 10);

export function RaffleForm({ raffle }: { raffle?: Raffle }) {
  const now = new Date();
  const start = raffle?.startsAt ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = raffle?.endsAt ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const name = raffle?.name ?? `${start.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' })} wager raffle`;
  return (
    <form action={saveRaffle} className="stack" style={{ gap: 14 }}>
      {raffle ? <input type="hidden" name="id" value={raffle.id} /> : null}
      <fieldset disabled={Boolean(raffle && raffle.status !== 'draft')} className="stack" style={{ gap: 14, border: 0, padding: 0, margin: 0 }}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="r-name">Name</label>
            <input id="r-name" name="name" className="input" defaultValue={name} required />
          </div>
          <div className="field">
            <label htmlFor="r-start">Start (UTC day)</label>
            <input id="r-start" name="startDay" type="date" className="input" defaultValue={day(start)} required />
          </div>
          <div className="field">
            <label htmlFor="r-end">End (UTC day, inclusive)</label>
            <input id="r-end" name="endDay" type="date" className="input" defaultValue={day(end)} required />
          </div>
          <div className="field">
            <label htmlFor="r-metric">Count</label>
            <select id="r-metric" name="metric" className="input" defaultValue={raffle?.metric ?? 'wagered'}>
              <option value="wagered">Total wagered</option>
              <option value="weighted">Weighted wagered</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="r-per">Dollars per ticket</label>
            <input id="r-per" name="usdPerTicket" type="number" min="1" step="1" className="input" defaultValue={raffle?.usdPerTicket ?? 1000} required />
          </div>
          <div className="field">
            <label htmlFor="r-max">Max tickets per member</label>
            <input id="r-max" name="maxTicketsPerUser" type="number" min="1" step="1" className="input" defaultValue={raffle?.maxTicketsPerUser ?? 100} required />
          </div>
        </div>
        <div className="field">
          <label htmlFor="r-prizes">Prizes in dollars, 1st first (one winner per prize)</label>
          <input id="r-prizes" name="prizes" className="input" defaultValue={(raffle?.prizes ?? [500, 250, 100, 50, 50]).join(', ')} required />
        </div>
        <div>
          <button className="btn btn--primary" type="submit">
            {raffle ? 'Save changes' : 'Create raffle'}
          </button>
        </div>
      </fieldset>
    </form>
  );
}

const TIMER_MINUTES = [2, 3, 5, 7, 10, 15, 30];

export function GiveawayForm({ giveaway }: { giveaway?: Giveaway }) {
  const e = (giveaway?.eligibility ?? { kickLinked: true, minDiscordAgeDays: 7 }) as Eligibility;
  return (
    <form action={saveGiveaway} className="stack" style={{ gap: 14 }}>
      {giveaway ? <input type="hidden" name="id" value={giveaway.id} /> : null}
      <fieldset disabled={Boolean(giveaway && giveaway.status !== 'draft')} className="stack" style={{ gap: 14, border: 0, padding: 0, margin: 0 }}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="g-title">Internal title</label>
            <input id="g-title" name="title" className="input" defaultValue={giveaway?.title ?? 'Stream giveaway'} required />
          </div>
          <div className="field">
            <label htmlFor="g-prize">Prize (shown publicly)</label>
            <input id="g-prize" name="prize" className="input" defaultValue={giveaway?.prize ?? '$10 Roobet tip'} required />
          </div>
          <div className="field">
            <label htmlFor="g-kw">Chat keyword (blank = site only)</label>
            <input id="g-kw" name="entryKeyword" className="input" defaultValue={giveaway ? (giveaway.entryKeyword ?? '') : '!join'} />
          </div>
          <div className="field">
            <label htmlFor="g-win">Winners</label>
            <input id="g-win" name="winnersCount" type="number" min="1" max="50" className="input" defaultValue={giveaway?.winnersCount ?? 1} />
          </div>
          <div className="field">
            <label htmlFor="g-timer">Auto-draw timer (starts when opened)</label>
            <select id="g-timer" name="timerMinutes" className="input" defaultValue={giveaway ? String(giveaway.timerMinutes ?? '') : '5'}>
              <option value="">No timer, draw by hand</option>
              {TIMER_MINUTES.map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="g-age">Min Discord account age (days)</label>
            <input id="g-age" name="minDiscordAgeDays" type="number" min="0" className="input" defaultValue={e.minDiscordAgeDays ?? 0} />
          </div>
          <div className="field">
            <label htmlFor="g-watch">Min watch time (hours)</label>
            <input id="g-watch" name="minWatchHours" type="number" min="0" step="0.5" className="input" defaultValue={e.minWatchMinutes ? e.minWatchMinutes / 60 : 0} />
          </div>
        </div>
        <label className="check">
          <input type="checkbox" name="kickLinked" defaultChecked={e.kickLinked ?? false} />
          Needs a linked Kick account (required for chat entry)
        </label>
        <label className="check">
          <input type="checkbox" name="roobetApproved" defaultChecked={e.roobetApproved ?? false} />
          Needs an approved Roobet username
        </label>
        <div>
          <button className="btn btn--primary" type="submit">
            {giveaway ? 'Save changes' : 'Create giveaway'}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
