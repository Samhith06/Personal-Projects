import type { Metadata } from 'next';
import Link from 'next/link';
import { AutoRefresh } from '@/components/AutoRefresh';
import { Flash, type FlashParams } from '@/components/admin/Flash';
import { BonusTable, HuntKpis, huntNumbers, huntPhase } from '@/components/admin/HuntDetail';
import { SlotThumb } from '@/components/hall-of-fame/SlotArt';
import {
  addBonusAction,
  addRequestAction,
  deleteHuntAction,
  guessingAction,
  markHuntPrizePaid,
  saveHuntAction,
  setPhaseAction,
  setRequestStatusAction,
  startHuntAction,
  syncHuntsNow,
  toggleHuntRequests,
} from '@/server/actions/hunts';
import { bonushuntKey } from '@/server/bonushunt/sync';
import { isLocalHunt } from '@/server/services/hunt-admin';
import { BONUS_TYPES, requestsFor } from '@/server/services/hunt-requests';
import { artFor, knownSlots, slotArt } from '@/server/services/slot-art';
import { huntOverlayToken } from '@/server/services/hunt-overlay';
import { currentHunt, listHunts, guessList, huntWinnerName } from '@/server/services/hunts';
import { syncStatus } from '@/server/services/sync-status';
import { siteUrl } from '@/lib/env';
import { formatAgo, formatBet } from '@/lib/format';

export const metadata: Metadata = { title: 'Bonus hunt' };

const money2 = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PHASE_TAG = { collecting: ['Collecting', 'tag--accent'], opening: ['Opening', 'tag--warn'], finished: ['Finished', 'tag--neutral'] } as const;

/**
 * The bonus hunt, run from here (MattySpins layout): start a hunt, add bonuses
 * as they land, open guessing, then enter each payout while opening. Hunts
 * started on bonushunt.gg still sync in and show the same way, read-only.
 */
export default async function HuntsAdmin({ searchParams }: { searchParams: FlashParams }) {
  const flash = await searchParams;
  const [hunt, sync, token, past, slots] = await Promise.all([currentHunt(), syncStatus('bonushunt'), huntOverlayToken(), listHunts(true), knownSlots()]);
  const n = hunt ? huntNumbers(hunt) : null;
  const [guesses, winnerName, requests, art] = await Promise.all([
    hunt ? guessList(hunt.id, n!.won) : [],
    hunt ? huntWinnerName(hunt) : null,
    hunt ? requestsFor(hunt.id, ['pending', 'added']) : [],
    slotArt(),
  ]);
  const pending = requests.filter((r) => r.status === 'pending');
  const added = requests.filter((r) => r.status === 'added');
  const phase = hunt ? huntPhase(hunt) : null;
  const local = hunt ? isLocalHunt(hunt) : false;
  const earlier = past.filter((h) => h.id !== hunt?.id).length;

  return (
    <div className="stack" style={{ gap: 16 }}>
      {/* While a hunt collects, chat's !sr requests and guesses arrive on their
          own; the screen picks them up without a reload. */}
      {phase === 'collecting' ? <AutoRefresh seconds={5} /> : null}

      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span className="kicker">Stream games</span>
          <h1 className="admin__title">Bonus hunt</h1>
          <p className="admin__sub">
            Chat suggests with <b>!sr &lt;slot&gt;</b> and guesses with <b>!guess &lt;amount&gt;</b>. The public page is{' '}
            <Link href="/hunts">/hunts</Link>.
          </p>
        </div>
        <Link className="btn btn--secondary" href="/admin/hunts/history">
          History{earlier ? ` · ${earlier}` : ''}
        </Link>
      </div>
      <Flash {...flash} />

      {!hunt || phase === 'finished' ? (
        <section className="card stack" style={{ gap: 14 }}>
          <div>
            <strong className="hunt-h">Start a hunt</strong>
            <p className="meta" style={{ marginTop: 4 }}>
              Chat can !sr slots the moment it starts. Guessing opens separately, when you choose.
            </p>
          </div>
          <form action={startHuntAction} className="hunt-form">
            <div className="field">
              <label htmlFor="hunt-title">Name</label>
              <input id="hunt-title" name="title" className="input" placeholder="Friday Send" maxLength={80} required />
            </div>
            <div className="field">
              <label htmlFor="hunt-start">Start balance ($)</label>
              <input id="hunt-start" name="startCost" className="input" inputMode="decimal" placeholder="1000" required />
            </div>
            <button className="btn btn--primary" type="submit">
              Start hunt
            </button>
          </form>
        </section>
      ) : null}

      <details className="card hunt-fold">
        <summary>OBS overlay</summary>
        <div className="stack" style={{ gap: 8, marginTop: 12 }}>
          <code className="hash">{siteUrl(`/overlay/hunt/${token}`)}</code>
          <span className="meta">
            Add it as a Browser source at 1920×1080; the background is transparent. Shows the current hunt, the guess count and the
            leaderboard ticker. Add ?preview=1 to check it in a browser.
          </span>
        </div>
      </details>

      {bonushuntKey() || sync ? (
        <details className={`card hunt-fold${sync?.lastError ? ' is-error' : ''}`} open={!!sync?.lastError}>
          <summary>
            bonushunt.gg sync{' '}
            <span className="meta">· {sync?.lastOkAt ? `last good pull ${formatAgo(sync.lastOkAt)}` : 'no successful pull yet'}</span>
          </summary>
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
            <span className="meta">
              Hunts started on bonushunt.gg come in every 30 seconds and show here read-only.
              {sync?.lastError ? ` Last error: ${sync.lastError}` : ''}
            </span>
            <form action={syncHuntsNow}>
              <button className="btn btn--secondary" type="submit">
                Sync now
              </button>
            </form>
          </div>
        </details>
      ) : null}

      {!hunt || !n || !phase ? (
        <div className="emptyq">No hunt yet. Start one above.</div>
      ) : (
        <>
          <section className="card stack" style={{ gap: 16 }}>
            <div className="hunt-tags">
              <span className={`tag ${PHASE_TAG[phase][1]}`}>{PHASE_TAG[phase][0]}</span>
              <span className="tag tag--neutral">
                {hunt.settledAt ? 'Guesses settled' : hunt.guessesOpen && phase === 'collecting' ? 'Guessing open' : 'Guessing not open'}
              </span>
              {phase === 'collecting' ? <span className="tag tag--neutral">{hunt.requestsOpen ? '!sr open' : '!sr closed'}</span> : null}
              {hunt.guessPrize ? <span className="tag tag--warn">{hunt.guessPrize} prize</span> : null}
              {local ? null : <span className="tag tag--neutral">bonushunt.gg</span>}
              {hunt.hidden ? <span className="tag tag--danger">hidden</span> : null}
            </div>

            {local && !hunt.settledAt ? (
              <form action={saveHuntAction} className="hunt-form">
                <input type="hidden" name="huntId" value={hunt.id} />
                <div className="field">
                  <label htmlFor="edit-title">Name</label>
                  <input id="edit-title" name="title" className="input" defaultValue={hunt.title} maxLength={80} required />
                </div>
                <div className="field">
                  <label htmlFor="edit-start">Start balance ($)</label>
                  <input id="edit-start" name="startCost" className="input" inputMode="decimal" defaultValue={String(hunt.startCost)} required />
                </div>
                <button className="btn btn--secondary" type="submit">
                  Save
                </button>
              </form>
            ) : (
              <strong className="hunt-h">{hunt.title}</strong>
            )}

            {phase !== 'finished' ? (
              <div className="hunt-switches">
                {phase === 'collecting' ? (
                  <form action={toggleHuntRequests}>
                    <input type="hidden" name="huntId" value={hunt.id} />
                    <input type="hidden" name="open" value={hunt.requestsOpen ? '0' : '1'} />
                    <button className="btn btn--secondary" type="submit">
                      {hunt.requestsOpen ? 'Close !sr' : 'Open !sr'}
                    </button>
                  </form>
                ) : null}
                {phase === 'collecting' ? (
                  <form action={guessingAction} className="hunt-switches__guess">
                    <input type="hidden" name="huntId" value={hunt.id} />
                    <input type="hidden" name="open" value={hunt.guessesOpen ? '0' : '1'} />
                    <label htmlFor="guess-prize" className="meta">
                      Prize
                    </label>
                    <input id="guess-prize" name="guessPrize" className="input" placeholder="$100 tip" defaultValue={hunt.guessPrize ?? ''} maxLength={80} />
                    <button className="btn btn--secondary" type="submit">
                      {hunt.guessesOpen ? 'Close guessing' : 'Open guessing'}
                    </button>
                  </form>
                ) : null}
                {local ? (
                  <>
                    {phase === 'opening' ? <PhaseButton huntId={hunt.id} phase="collecting" label="Back to collecting" /> : null}
                    {phase === 'collecting' ? (
                      <PhaseButton huntId={hunt.id} phase="opening" label="Start opening" primary disabled={n.bonuses.length === 0} />
                    ) : (
                      <PhaseButton huntId={hunt.id} phase="finished" label="Finish hunt" primary disabled={n.left.length > 0} />
                    )}
                  </>
                ) : (
                  <Link className="btn btn--secondary" href={`/admin/hunts/${hunt.id}`}>
                    Hunt settings
                  </Link>
                )}
              </div>
            ) : null}
            {phase === 'opening' && local ? (
              <p className="meta">
                Type each payout as it lands and press Enter. {n.left.length ? `${n.left.length} left to open.` : 'All opened — finish the hunt to settle the guesses.'}
              </p>
            ) : null}

            {hunt.settledAt ? (
              <p>
                Final balance <b>{money2(n.won)}</b> ·{' '}
                {winnerName ? (
                  <>
                    winner <b>{winnerName}</b>
                    {hunt.winnerGuess !== null ? ` (guessed ${money2(hunt.winnerGuess)})` : ''}
                    {hunt.guessPrize ? (hunt.prizePaidAt ? `, paid ${hunt.guessPrize}` : `, owed ${hunt.guessPrize}`) : ''}
                  </>
                ) : (
                  'no linked account guessed'
                )}
              </p>
            ) : null}

            {(hunt.winnerUserId && hunt.guessPrize && !hunt.prizePaidAt) || (local && !(hunt.winnerUserId && hunt.guessPrize)) ? (
              <div className="hunt-danger">
                {hunt.winnerUserId && hunt.guessPrize && !hunt.prizePaidAt ? (
                  <form action={markHuntPrizePaid}>
                    <input type="hidden" name="huntId" value={hunt.id} />
                    <input type="hidden" name="back" value="/admin/hunts" />
                    <button className="btn btn--primary" type="submit">
                      Mark prize paid
                    </button>
                  </form>
                ) : null}
                {/* A hunt that paid a prize is the record of that payment, so it has no delete button (the service refuses it too). */}
                {local && !(hunt.winnerUserId && hunt.guessPrize) ? (
                  <form action={deleteHuntAction}>
                    <input type="hidden" name="huntId" value={hunt.id} />
                    <button className="btn btn--danger-ghost" type="submit">
                      Delete hunt
                    </button>
                  </form>
                ) : null}
              </div>
            ) : null}
          </section>

          <HuntKpis hunt={hunt} />

          {local && phase !== 'finished' ? (
            <section className="card stack" style={{ gap: 12 }}>
              <strong className="hunt-h">Add a bonus</strong>
              <form action={addBonusAction} className="hunt-form">
                <input type="hidden" name="huntId" value={hunt.id} />
                <div className="field">
                  <label htmlFor="bonus-slot">Slot</label>
                  <input id="bonus-slot" name="slot" className="input" list="known-slots" placeholder="Search past slots or type a name" maxLength={80} required autoComplete="off" />
                  <datalist id="known-slots">
                    {slots.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
                <div className="field">
                  <label htmlFor="bonus-bet">Bet ($)</label>
                  <input id="bonus-bet" name="bet" className="input" inputMode="decimal" placeholder="2.00" required />
                </div>
                <button className="btn btn--primary" type="submit">
                  Add
                </button>
              </form>
            </section>
          ) : null}

          <section className="stack" style={{ gap: 10 }}>
            <strong className="hunt-h">Bonuses</strong>
            <BonusTable hunt={hunt} />
          </section>

          {phase === 'collecting' ? (
            <section className="stack" style={{ gap: 10 }}>
              <strong className="hunt-h">
                Chat requests <span className="meta">({pending.length} waiting)</span>
              </strong>
              {pending.length === 0 ? (
                <div className="emptyq">{hunt.requestsOpen ? 'Nobody has typed !sr yet.' : '!sr is closed.'}</div>
              ) : (
                <div className="card" style={{ padding: '4px 18px' }}>
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
                </div>
              )}
              {added.length ? (
                <details className="card hunt-fold">
                  <summary>Added from chat · {added.length}</summary>
                  <div className="table-wrap" style={{ marginTop: 10 }}>
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
                </details>
              ) : null}
            </section>
          ) : null}

          <section className="stack" style={{ gap: 10 }}>
            <strong className="hunt-h">
              Guesses <span className="meta">({guesses.length})</span>
            </strong>
            {guesses.length === 0 ? (
              <div className="emptyq">No guesses.</div>
            ) : (
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
                        <td>
                          {g.name}
                          {hunt.winnerUserId === g.userId ? (
                            <span className="tag tag--warn" style={{ marginLeft: 8 }}>
                              Winner
                            </span>
                          ) : null}
                        </td>
                        <td className="num" style={{ textAlign: 'right' }}>
                          {money2(g.amount)}
                        </td>
                        <td className="num meta" style={{ textAlign: 'right' }}>
                          {money2(Math.abs(g.amount - n.won))}
                        </td>
                        <td className="meta">{g.source}</td>
                        <td className="meta">{formatAgo(g.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="meta" style={{ maxWidth: '72ch' }}>
              Sorted by distance from the {phase === 'finished' ? 'final' : 'current'} balance ({money2(n.won)}). Only members with a linked
              account can guess, so the prize goes to the closest one; a tie goes to whoever guessed first.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

function PhaseButton({ huntId, phase, label, primary, disabled }: { huntId: string; phase: string; label: string; primary?: boolean; disabled?: boolean }) {
  return (
    <form action={setPhaseAction}>
      <input type="hidden" name="huntId" value={huntId} />
      <input type="hidden" name="phase" value={phase} />
      <button className={`btn ${primary ? 'btn--primary' : 'btn--secondary'}`} type="submit" disabled={disabled}>
        {label}
      </button>
    </form>
  );
}
