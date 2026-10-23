import type { Metadata } from 'next';
import Link from 'next/link';
import { Flash, type FlashParams } from '@/components/admin/Flash';
import { HuntDetail } from '@/components/admin/HuntDetail';
import { SlotThumb } from '@/components/hall-of-fame/SlotArt';
import { addRequestAction, setRequestStatusAction, syncHuntsNow, toggleHuntRequests } from '@/server/actions/hunts';
import { BONUS_TYPES, requestsFor, requestsOpen } from '@/server/services/hunt-requests';
import { artFor, slotArt } from '@/server/services/slot-art';
import { huntOverlayToken } from '@/server/services/hunt-overlay';
import { currentHunt, listHunts, guessList, huntStats, huntWinnerName } from '@/server/services/hunts';
import { syncStatus } from '@/server/services/sync-status';
import { siteUrl } from '@/lib/env';
import { formatAgo, formatBet } from '@/lib/format';

export const metadata: Metadata = { title: 'Bonus hunts' };

const money2 = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function HuntsAdmin({ searchParams }: { searchParams: FlashParams }) {
  const flash = await searchParams;
  const [current, sync, token, past] = await Promise.all([currentHunt(), syncStatus('bonushunt'), huntOverlayToken(), listHunts(true)]);
  const target = current ? (huntStats(current).totalWinnings ?? null) : null;
  const [guesses, winnerName, requests, art] = await Promise.all([
    current ? guessList(current.id, target) : [],
    current ? huntWinnerName(current) : null,
    current ? requestsFor(current.id, ['pending', 'added']) : [],
    slotArt(),
  ]);
  const pending = requests.filter((r) => r.status === 'pending');
  const added = requests.filter((r) => r.status === 'added');

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span className="kicker">Stream games</span>
          <h1 className="admin__title">Bonus hunts</h1>
          <p className="admin__sub">
            Hunts come from bonushunt.gg every 30 seconds. Guessing closes on its own when the opening starts; the closest guess wins
            when the hunt completes.
          </p>
        </div>
        <Link className="btn btn--secondary" href="/admin/hunts/history">
          History{past.length > 1 ? ` · ${past.filter((h) => h.id !== current?.id).length}` : ''}
        </Link>
      </div>
      <Flash {...flash} />

      <section className={`notice ${sync?.lastError ? 'notice--danger' : 'notice--ok'} row`} style={{ justifyContent: 'space-between' }}>
        <span>
          bonushunt.gg sync: {sync?.lastOkAt ? `last good pull ${formatAgo(sync.lastOkAt)}` : 'no successful pull yet'}
          {sync?.lastError ? ` · last error: ${sync.lastError}` : ''}
        </span>
        <form action={syncHuntsNow}>
          <button className="btn btn--secondary" type="submit">
            Sync now
          </button>
        </form>
      </section>

      {current ? (
        <HuntDetail hunt={current} winnerName={winnerName} back="/admin/hunts" />
      ) : (
        <div className="emptyq">No hunts synced yet. Start one on bonushunt.gg and it shows here within 30 seconds.</div>
      )}


      {current && !current.completed ? (
        <section className="card stack" style={{ gap: 10 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong>
              Slot requests for “{current.title}” · {pending.length} waiting
            </strong>
            <form action={toggleHuntRequests}>
              <input type="hidden" name="huntId" value={current.id} />
              <input type="hidden" name="open" value={current.requestsOpen ? '0' : '1'} />
              <button className={current.requestsOpen ? 'btn btn--secondary' : 'btn btn--primary'} type="submit">
                {current.requestsOpen ? 'Close !sr' : 'Open !sr'}
              </button>
            </form>
          </div>
          <span className="meta">
            Chat suggests with <code>!sr slot name</code> {requestsOpen(current) ? 'right now' : current.isOpening ? '— closed while opening' : '— closed'}. Buy the
            ones you like and put them on bonushunt.gg, then Add them here with the base bet and whether it&apos;s a normal, super or hidden
            bonus.
          </span>
          {pending.length === 0 ? <div className="emptyq">Nothing waiting.</div> : null}
          {pending.map((r) => (
            <div key={r.id} className="admin-row">
              <div className="slotcell admin-row__body">
                <SlotThumb name={r.slot} image={artFor(art, r.slot)} size={36} />
                <span>
                  <b>{r.slot}</b>
                  <small>
                    {r.kickUsername} · {formatAgo(r.createdAt)}
                  </small>
                </span>
              </div>
              <form action={addRequestAction} className="req-add">
                <input type="hidden" name="requestId" value={r.id} />
                <label className="visually-hidden" htmlFor={`bet-${r.id}`}>
                  Base bet for {r.slot}
                </label>
                <span className="req-add__bet">
                  <span aria-hidden="true">$</span>
                  <input id={`bet-${r.id}`} name="bet" className="input" inputMode="decimal" placeholder="Base bet" required />
                </span>
                <fieldset className="seg">
                  <legend className="visually-hidden">Bonus type for {r.slot}</legend>
                  {BONUS_TYPES.map((type) => (
                    <label key={type}>
                      <input type="radio" name="bonusType" value={type} defaultChecked={type === 'normal'} />
                      <span>{type}</span>
                    </label>
                  ))}
                </fieldset>
                <button className="btn btn--primary" type="submit">
                  Add
                </button>
              </form>
              <form action={setRequestStatusAction}>
                <input type="hidden" name="requestId" value={r.id} />
                <button className="btn btn--secondary" name="status" value="dismissed" type="submit">
                  Dismiss
                </button>
              </form>
            </div>
          ))}
          {added.length ? (
            <div className="stack" style={{ gap: 6 }}>
              <span className="kicker">Added to the hunt · {added.length}</span>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Slot</th>
                      <th>Requested by</th>
                      <th style={{ textAlign: 'right' }}>Base bet</th>
                      <th>Bonus</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {added.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <div className="slotcell">
                            <SlotThumb name={r.slot} image={artFor(art, r.slot)} size={28} />
                            <b>{r.slot}</b>
                          </div>
                        </td>
                        <td className="meta">{r.kickUsername}</td>
                        <td className="num" style={{ textAlign: 'right' }}>
                          {r.bet !== null ? formatBet(r.bet) : '—'}
                        </td>
                        <td>{r.bonusType ? <span className={`tag bonus-tag bonus-tag--${r.bonusType}`}>{r.bonusType}</span> : <span className="meta">—</span>}</td>
                        <td style={{ textAlign: 'right' }}>
                          <form action={setRequestStatusAction}>
                            <input type="hidden" name="requestId" value={r.id} />
                            <button className="btn btn--secondary" name="status" value="pending" type="submit">
                              Undo
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {current ? (
        <section className="card">
          <strong>
            Guesses on “{current.title}” · {guesses.length}
          </strong>
          <p className="meta" style={{ margin: '4px 0 8px' }}>
            Sorted by distance from the current balance ({money2(target ?? 0)}).
          </p>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Member</th>
                  <th style={{ textAlign: 'right' }}>Guess</th>
                  <th style={{ textAlign: 'right' }}>Off by</th>
                  <th>Via</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {guesses.slice(0, 100).map((g, i) => (
                  <tr key={g.userId}>
                    <td className="meta num">{i + 1}</td>
                    <td>{g.name}</td>
                    <td className="num" style={{ textAlign: 'right' }}>
                      {money2(g.amount)}
                    </td>
                    <td className="num meta" style={{ textAlign: 'right' }}>
                      {money2(Math.abs(g.amount - (target ?? 0)))}
                    </td>
                    <td className="meta">{g.source}</td>
                    <td className="meta">{formatAgo(g.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {guesses.length === 0 ? <p className="meta" style={{ padding: 8 }}>No guesses yet.</p> : null}
          </div>
        </section>
      ) : null}

      <section className="card stack" style={{ gap: 8 }}>
        <strong>OBS browser source — hunt overlay</strong>
        <code className="hash">{siteUrl(`/overlay/hunt/${token}`)}</code>
        <span className="meta">1920×1080, transparent. Shows the current hunt, the guess count and the leaderboard ticker. Add ?preview=1 to check it in a browser.</span>
      </section>
    </div>
  );
}
