'use client';

import { useState } from 'react';
import { addSlot, removeSlot, syncSlots } from '@/server/actions/hunts';
import { NoteText, useAction } from './HuntControls';

/* The slot catalog's admin controls (ported from MattySpins). */

export function SyncSlotsButton() {
  const { note, pending, run } = useAction();
  return (
    <div className="row" style={{ gap: 10 }}>
      <button className="btn btn--primary" disabled={pending} onClick={() => run(syncSlots)}>
        {pending ? 'Syncing… (about 20 pages)' : 'Sync from bonushunt.gg'}
      </button>
      <NoteText note={note} />
    </div>
  );
}

/**
 * For the slots the feed has never shown — anything older than a week. !sr
 * matches against these exactly like synced rows.
 */
export function AddSlotForm() {
  const { note, pending, run } = useAction();
  const [key, setKey] = useState(0);
  return (
    <form key={key} className="card stack" style={{ gap: 12 }} action={(data: FormData) => run(() => addSlot(data), (ok) => ok && setKey((k) => k + 1))}>
      <strong className="hunt-h">Add a slot by hand</strong>
      <div className="slot-form">
        <div className="field">
          <label htmlFor="slot-name">Name</label>
          <input id="slot-name" name="name" className="input" placeholder="Sugar Rush 1000" maxLength={80} required />
        </div>
        <div className="field">
          <label htmlFor="slot-provider">Provider</label>
          <input id="slot-provider" name="provider" className="input" placeholder="Pragmatic Play" maxLength={60} />
        </div>
        <div className="field">
          <label htmlFor="slot-image">Image URL (https, optional)</label>
          <input id="slot-image" name="imageUrl" className="input" type="url" placeholder="https://…" />
        </div>
        <label className="check">
          <input type="checkbox" name="bonusBuy" /> Bonus buy
        </label>
        <button className="btn btn--secondary" type="submit" disabled={pending}>
          {pending ? 'Adding…' : 'Add'}
        </button>
      </div>
      <NoteText note={note} />
    </form>
  );
}

export function RemoveSlotButton({ slotId, name }: { slotId: number; name: string }) {
  const { note, pending, run } = useAction();
  if (note?.ok) return <NoteText note={note} />;
  return (
    <>
      <button className="btn btn--secondary" disabled={pending} onClick={() => run(() => removeSlot(slotId, name))}>
        Remove
      </button>
      <NoteText note={note} />
    </>
  );
}
