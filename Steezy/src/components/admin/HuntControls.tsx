'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import {
  addHuntBonus,
  deleteBonus,
  dismissSlotRequest,
  findSlots,
  lockGuessing,
  markHuntPrizePaid,
  moveHunt,
  openGuessing,
  removeHunt,
  saveBonusPayout,
  saveHunt,
  settleHunt,
  startHunt,
  toggleRequests,
  type Outcome,
} from '@/server/actions/hunts';
import type { Slot } from '@/server/services/slots';
import { SlotArt } from '@/components/stream-games/SlotArt';

/*
 * The bonus hunt's admin controls (ported from MattySpins). Each runs one
 * action and shows what it said next to it, so nothing reloads mid-stream.
 */

type Note = { ok: boolean; text: string } | null;

/** One action in flight and what it said, the same pattern every control here uses. */
export function useAction() {
  const [note, setNote] = useState<Note>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<Outcome>, after?: (ok: boolean) => void) =>
    start(async () => {
      const result = await fn();
      setNote(result.ok ? { ok: true, text: result.message } : { ok: false, text: result.error });
      after?.(result.ok);
    });
  return { note, pending, run };
}

export function NoteText({ note }: { note: Note }) {
  if (!note) return null;
  return (
    <span className="meta" style={{ color: note.ok ? 'var(--color-accent)' : 'var(--color-danger)' }}>
      {note.text}
    </span>
  );
}

/* -------------------------------------------------------------------------- */

export function StartHuntForm() {
  const { note, pending, run } = useAction();
  return (
    <form className="card stack" style={{ gap: 14 }} action={(data: FormData) => run(() => startHunt(data))}>
      <div>
        <strong className="hunt-h">Start a hunt</strong>
        <p className="meta" style={{ marginTop: 4 }}>
          Chat can <b>!sr</b> slots the moment it starts. Guessing opens separately, when you choose.
        </p>
      </div>
      <div className="hunt-form">
        <div className="field">
          <label htmlFor="hunt-title">Name</label>
          <input id="hunt-title" name="title" className="input" placeholder="Friday Send" maxLength={80} required />
        </div>
        <div className="field">
          <label htmlFor="hunt-start">Start balance ($)</label>
          <input id="hunt-start" name="startCost" className="input" inputMode="decimal" placeholder="1000" required />
        </div>
        <button className="btn btn--primary" type="submit" disabled={pending}>
          {pending ? 'Starting…' : 'Start hunt'}
        </button>
      </div>
      <NoteText note={note} />
    </form>
  );
}

export function HuntSettings({ huntId, title, startCost }: { huntId: number; title: string; startCost: number }) {
  const { note, pending, run } = useAction();
  return (
    <form action={(data: FormData) => run(() => saveHunt(data))} className="stack" style={{ gap: 6 }}>
      <input type="hidden" name="huntId" value={huntId} />
      <div className="hunt-form">
        <div className="field">
          <label htmlFor="hs-title">Name</label>
          <input id="hs-title" name="title" className="input" defaultValue={title} maxLength={80} required />
        </div>
        <div className="field">
          <label htmlFor="hs-start">Start balance ($)</label>
          <input id="hs-start" name="startCost" className="input" inputMode="decimal" defaultValue={startCost} required />
        </div>
        <button className="btn btn--secondary" type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </button>
      </div>
      <NoteText note={note} />
    </form>
  );
}

/* -------------------------------------------------------------------------- */

type Phase = 'collecting' | 'opening' | 'finished';
type Gtb = 'closed' | 'open' | 'locked' | 'settled';

/**
 * The hunt's switches in the order a stream uses them: requests while
 * collecting, guessing opened then locked, start opening, finish, settle.
 * Only the moves that are legal right now are shown.
 */
export function HuntSwitches({
  huntId,
  status,
  requestsOpen,
  gtbStatus,
  gtbPrize,
  unopened,
}: {
  huntId: number;
  status: Phase;
  requestsOpen: boolean;
  gtbStatus: Gtb;
  gtbPrize: string | null;
  unopened: number;
}) {
  const { note, pending, run } = useAction();
  const [prize, setPrize] = useState(gtbPrize ?? '');

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="hunt-switches">
        {status === 'collecting' ? (
          <button className="btn btn--secondary" disabled={pending} onClick={() => run(() => toggleRequests(huntId, !requestsOpen))}>
            {requestsOpen ? 'Close !sr' : 'Open !sr'}
          </button>
        ) : null}

        {status === 'collecting' && gtbStatus !== 'open' ? (
          <form className="hunt-switches__guess" action={(data: FormData) => run(() => openGuessing(data))}>
            <input type="hidden" name="huntId" value={huntId} />
            <label className="meta" htmlFor="gtb-prize">
              Prize
            </label>
            <input id="gtb-prize" name="prize" className="input" placeholder="$100 tip" maxLength={80} value={prize} onChange={(e) => setPrize(e.target.value)} />
            <button className="btn btn--secondary" type="submit" disabled={pending}>
              {gtbStatus === 'locked' ? 'Reopen guessing' : 'Open guessing'}
            </button>
          </form>
        ) : null}

        {gtbStatus === 'open' ? (
          <button className="btn btn--secondary" disabled={pending} onClick={() => run(() => lockGuessing(huntId))}>
            Lock guessing
          </button>
        ) : null}

        {status === 'collecting' ? (
          <button className="btn btn--primary" disabled={pending} onClick={() => run(() => moveHunt(huntId, 'opening'))}>
            Start opening
          </button>
        ) : null}

        {status === 'opening' ? (
          <>
            <button className="btn btn--secondary" disabled={pending} onClick={() => run(() => moveHunt(huntId, 'collecting'))}>
              Back to collecting
            </button>
            <button
              className="btn btn--primary"
              disabled={pending || unopened > 0}
              title={unopened > 0 ? `${unopened} still unopened` : undefined}
              onClick={() => run(() => moveHunt(huntId, 'finished'))}
            >
              Finish hunt
            </button>
          </>
        ) : null}

        {status === 'finished' && (gtbStatus === 'locked' || gtbStatus === 'open') ? (
          <button className="btn btn--primary" disabled={pending} onClick={() => run(() => settleHunt(huntId))}>
            Settle guesses{gtbPrize ? ` · ${gtbPrize}` : ''}
          </button>
        ) : null}
      </div>
      <NoteText note={note} />
    </div>
  );
}

/** Staff paid the guess-the-balance winner by hand. */
export function MarkPrizePaidButton({ huntId, label }: { huntId: number; label: string }) {
  const { note, pending, run } = useAction();
  return (
    <div className="row" style={{ gap: 10 }}>
      <button className="btn btn--primary" disabled={pending} onClick={() => run(() => markHuntPrizePaid(huntId))}>
        {pending ? 'Saving…' : label}
      </button>
      <NoteText note={note} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Adding a bonus. Type two letters and the catalog answers; pick one, or keep
 * typing and add it as a free-text name — the catalog only knows what the
 * bonushunt.gg feed has shown it, and a hunt can't wait for a sync.
 */
export function AddBonusForm({ huntId }: { huntId: number }) {
  const { note, pending, run } = useAction();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Slot[]>([]);
  const [picked, setPicked] = useState<Slot | null>(null);
  const [bet, setBet] = useState('');
  const betRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (picked || query.trim().length < 2) {
      setResults([]);
      return;
    }
    let live = true;
    const timer = setTimeout(async () => {
      const found = await findSlots(query);
      if (live) setResults(found);
    }, 200);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [query, picked]);

  const submit = (data: FormData) => {
    data.set('huntId', String(huntId));
    if (picked) data.set('slotId', String(picked.id));
    else data.set('name', query);
    run(
      () => addHuntBonus(data),
      (ok) => {
        if (!ok) return;
        setQuery('');
        setPicked(null);
      },
    );
  };

  return (
    <form action={submit} className="card stack" style={{ gap: 12 }}>
      <strong className="hunt-h">Add a bonus</strong>
      <div className="hunt-form">
        <div className="field" style={{ position: 'relative' }}>
          <label htmlFor="bonus-slot">Slot</label>
          <input
            id="bonus-slot"
            className="input"
            autoComplete="off"
            value={picked ? `${picked.name}${picked.provider ? ` · ${picked.provider}` : ''}` : query}
            onChange={(e) => {
              setPicked(null);
              setQuery(e.target.value);
            }}
            placeholder="Search the catalog or type a name"
            maxLength={80}
            required
          />
          {results.length > 0 ? (
            <div className="slot-suggest" role="listbox">
              {results.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => {
                    setPicked(slot);
                    setResults([]);
                    betRef.current?.focus();
                  }}
                >
                  <SlotArt src={slot.imageUrl} name={slot.name} width={26} />
                  <span>
                    <b>{slot.name}</b>
                    <small>{slot.provider || 'Unknown provider'}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="field">
          <label htmlFor="bonus-bet">Bet ($)</label>
          <input id="bonus-bet" ref={betRef} name="bet" className="input" inputMode="decimal" value={bet} onChange={(e) => setBet(e.target.value)} placeholder="2.00" required />
        </div>
        <button className="btn btn--primary" type="submit" disabled={pending}>
          {pending ? 'Adding…' : 'Add'}
        </button>
      </div>
      <div style={{ minHeight: 18 }}>
        {!picked && query.trim().length >= 2 && results.length === 0 ? (
          <span className="meta">Not in the catalog — it will be added by name.</span>
        ) : (
          <NoteText note={note} />
        )}
      </div>
    </form>
  );
}

/** A bonus row's payout box: Enter saves, empty clears. */
export function PayoutInput({ bonusId, payout }: { bonusId: number; payout: number | null }) {
  const { note, pending, run } = useAction();
  return (
    <form className="payout-form" action={(data: FormData) => run(() => saveBonusPayout(data))}>
      <input type="hidden" name="bonusId" value={bonusId} />
      <input name="payout" className="input" inputMode="decimal" defaultValue={payout ?? ''} placeholder="payout" aria-label="Payout" />
      <button className="btn btn--secondary" type="submit" disabled={pending}>
        {pending ? '…' : 'Save'}
      </button>
      {note && !note.ok ? <NoteText note={note} /> : null}
    </form>
  );
}

/**
 * Deleting the whole hunt — for test runs. Asks first, and names the hunt, so
 * a slip of the mouse on stream can't take a real hunt with it.
 */
export function DeleteHuntButton({ huntId, title }: { huntId: number; title: string }) {
  const { note, pending, run } = useAction();
  return (
    <div className="row" style={{ gap: 10 }}>
      <button
        className="btn btn--danger-ghost"
        disabled={pending}
        onClick={() => {
          if (window.confirm(`Delete "${title}" and all its bonuses, requests and guesses? This cannot be undone.`)) {
            run(() => removeHunt(huntId));
          }
        }}
      >
        {pending ? 'Deleting…' : 'Delete hunt'}
      </button>
      {note && !note.ok ? <NoteText note={note} /> : null}
    </div>
  );
}

export function RemoveBonusButton({ bonusId }: { bonusId: number }) {
  const { note, pending, run } = useAction();
  return (
    <>
      <button className="btn btn--secondary" disabled={pending} onClick={() => run(() => deleteBonus(bonusId))}>
        Remove
      </button>
      {note && !note.ok ? <NoteText note={note} /> : null}
    </>
  );
}

/** A chat request: give it a bet and it joins the hunt, or dismiss it. */
export function RequestActions({ huntId, requestId }: { huntId: number; requestId: number }) {
  const { note, pending, run } = useAction();
  return (
    <div className="stack" style={{ gap: 6, alignItems: 'flex-end' }}>
      <form
        className="payout-form"
        action={(data: FormData) => {
          data.set('huntId', String(huntId));
          data.set('requestId', String(requestId));
          run(() => addHuntBonus(data));
        }}
      >
        <input name="bet" className="input" inputMode="decimal" placeholder="bet $" aria-label="Bet" required />
        <button className="btn btn--primary" type="submit" disabled={pending}>
          Add
        </button>
        <button className="btn btn--secondary" type="button" disabled={pending} onClick={() => run(() => dismissSlotRequest(requestId))}>
          Dismiss
        </button>
      </form>
      {note && !note.ok ? <NoteText note={note} /> : null}
    </div>
  );
}
