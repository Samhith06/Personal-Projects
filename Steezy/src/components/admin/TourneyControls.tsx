'use client';

import {
  endTourney,
  forfeitTourney,
  markTourneyPaid,
  nextTourneyBuy,
  removeTourney,
  removeTourneySignup,
  resolveTourney,
  seedTourney,
  skipTourney,
  startTourney,
  toggleTourneyRequests,
  undoTourneyResult,
} from '@/server/actions/tourney';
import { NoteText, useAction } from './HuntControls';

/* The slot tournament's admin controls (ported from MattySpins). */

export function StartTourneyForm() {
  const { note, pending, run } = useAction();
  return (
    <form className="card stack" style={{ gap: 14 }} action={(data: FormData) => run(() => startTourney(data))}>
      <div>
        <strong className="hunt-h">Open a slot tournament</strong>
        <p className="meta" style={{ marginTop: 4, maxWidth: '78ch' }}>
          Chat signs up with <b>!sr &lt;slot&gt;</b>. When you seed the bracket, players are picked and shuffled at random — with too few,
          the bracket shrinks and some get a bye. Each match is one bonus buy per player, and the higher multiplier goes through; a tie
          means both buy again. The champion wins the prize.
        </p>
      </div>
      <div className="tourney-form">
        <div className="field">
          <label htmlFor="tourney-title">Name</label>
          <input id="tourney-title" name="title" className="input" placeholder="Sunday Slot Cup" maxLength={80} required />
        </div>
        <div className="field">
          <label htmlFor="tourney-size">Bracket</label>
          <select id="tourney-size" name="size" className="input" defaultValue="8">
            <option value="4">4 players</option>
            <option value="8">8 players</option>
            <option value="16">16 players</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="tourney-prize">Champion prize</label>
          <input id="tourney-prize" name="prize" className="input" placeholder="$250" maxLength={80} />
        </div>
        <button className="btn btn--primary" type="submit" disabled={pending}>
          {pending ? 'Opening…' : 'Open sign-ups'}
        </button>
      </div>
      <NoteText note={note} />
    </form>
  );
}

/** Sign-ups: close or open !sr, then seed. */
export function SignupSwitches({ gameId, requestsOpen, signups, size }: { gameId: number; requestsOpen: boolean; signups: number; size: number }) {
  const { note, pending, run } = useAction();
  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="hunt-switches">
        <button
          className="btn btn--primary"
          disabled={pending || signups < 2}
          title={signups < 2 ? 'At least 2 players need to sign up' : undefined}
          onClick={() => {
            const extra = signups > size ? ` ${signups - size} of the ${signups} sign-ups will miss out, at random.` : '';
            if (window.confirm(`Seed the bracket now? Sign-ups close.${extra}`)) run(() => seedTourney(gameId));
          }}
        >
          {pending ? 'Seeding…' : `Seed the bracket (${signups} signed up)`}
        </button>
        <button className="btn btn--secondary" disabled={pending} onClick={() => run(() => toggleTourneyRequests(gameId, !requestsOpen))}>
          {requestsOpen ? 'Close !sr' : 'Open !sr'}
        </button>
        <button
          className="btn btn--secondary"
          disabled={pending}
          onClick={() => {
            if (window.confirm('End this tournament before it starts? Nobody wins.')) run(() => endTourney(gameId));
          }}
        >
          End tournament
        </button>
      </div>
      <NoteText note={note} />
    </div>
  );
}

/**
 * The bracket's controls while it is played. The main button starts the next
 * buy in the current match; it is held back while a buy is in play or once
 * the final is decided.
 */
export function TourneySwitches({
  gameId,
  requestsOpen,
  nextLabel,
  inPlay,
  decided,
  canUndo,
  current,
}: {
  gameId: number;
  requestsOpen: boolean;
  /** "spinqueen's buy (Quarter-finals)", or null with no match to play. */
  nextLabel: string | null;
  inPlay: boolean;
  decided: boolean;
  canUndo: boolean;
  /** The current match's players, for Forfeit. */
  current: { a: string; b: string } | null;
}) {
  const { note, pending, run } = useAction();
  const blocked = inPlay ? 'Record the buy in play first' : decided ? 'The final is decided — end the tournament' : null;

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="hunt-switches">
        <button className="btn btn--primary" disabled={pending || blocked != null || !nextLabel} title={blocked ?? undefined} onClick={() => run(() => nextTourneyBuy(gameId))}>
          {pending ? 'Starting…' : nextLabel ? `Start ${nextLabel}` : 'Start next buy'}
        </button>
        <button className="btn btn--secondary" disabled={pending} onClick={() => run(() => toggleTourneyRequests(gameId, !requestsOpen))}>
          {requestsOpen ? 'Close !sr' : 'Open !sr'}
        </button>
        {canUndo ? (
          <button className="btn btn--secondary" disabled={pending} onClick={() => run(() => undoTourneyResult(gameId))}>
            Undo last result
          </button>
        ) : null}
        <button
          className={`btn ${decided ? 'btn--primary' : 'btn--secondary'}`}
          disabled={pending || inPlay}
          title={inPlay ? 'Record or skip the buy in play first' : undefined}
          onClick={() => {
            if (decided || window.confirm('End this tournament before the final is decided? Nobody wins.')) {
              run(() => endTourney(gameId));
            }
          }}
        >
          {decided ? 'End & crown the champion' : 'End tournament'}
        </button>
      </div>
      {current && !inPlay && !decided ? (
        <div className="hunt-switches">
          <span className="meta">Can&apos;t play?</span>
          {(['a', 'b'] as const).map((side) => (
            <button
              key={side}
              className="btn btn--secondary"
              disabled={pending}
              onClick={() => {
                const loser = current[side];
                const winner = current[side === 'a' ? 'b' : 'a'];
                if (window.confirm(`${loser} forfeits the match, and ${winner} goes through?`)) run(() => forfeitTourney(gameId, side));
              }}
            >
              Forfeit {current[side]}
            </button>
          ))}
        </div>
      ) : null}
      <NoteText note={note} />
    </div>
  );
}

/** The player's buy: what it cost and what it paid, or skip it. */
export function TourneyResultForm({ turnId }: { turnId: number }) {
  const { note, pending, run } = useAction();
  return (
    <div className="stack" style={{ gap: 8 }}>
      <form className="tourney-result" action={(data: FormData) => run(() => resolveTourney(data))}>
        <input type="hidden" name="turnId" value={turnId} />
        <div className="field">
          <label htmlFor="tourney-cost">Buy cost ($)</label>
          <input id="tourney-cost" name="buyCost" className="input" inputMode="decimal" placeholder="200" required autoFocus />
        </div>
        <div className="field">
          <label htmlFor="tourney-payout">Paid ($)</label>
          <input id="tourney-payout" name="payout" className="input" inputMode="decimal" placeholder="0" required />
        </div>
        <button className="btn btn--primary" type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Record result'}
        </button>
        <button
          className="btn btn--secondary"
          type="button"
          disabled={pending}
          title="The slot can't be played — still their turn; they can !sr another, or forfeit them"
          onClick={() => run(() => skipTourney(turnId))}
        >
          Skip
        </button>
      </form>
      <div style={{ minHeight: 18 }}>
        <NoteText note={note} />
      </div>
    </div>
  );
}

export function RemoveSignupButton({ entryId }: { entryId: number }) {
  const { note, pending, run } = useAction();
  return (
    <>
      <button className="btn btn--secondary" disabled={pending} onClick={() => run(() => removeTourneySignup(entryId))}>
        Remove
      </button>
      {note && !note.ok ? <NoteText note={note} /> : null}
    </>
  );
}

/** Staff paid the champion by hand. */
export function MarkTourneyPaidButton({ gameId, label }: { gameId: number; label: string }) {
  const { note, pending, run } = useAction();
  return (
    <div className="row" style={{ gap: 10 }}>
      <button className="btn btn--primary" disabled={pending} onClick={() => run(() => markTourneyPaid(gameId))}>
        {pending ? 'Saving…' : label}
      </button>
      <NoteText note={note} />
    </div>
  );
}

export function DeleteTourneyButton({ gameId, title }: { gameId: number; title: string }) {
  const { note, pending, run } = useAction();
  return (
    <div className="row" style={{ gap: 10 }}>
      <button
        className="btn btn--danger-ghost"
        disabled={pending}
        onClick={() => {
          if (window.confirm(`Delete "${title}" with its bracket, buys and sign-ups? This cannot be undone.`)) run(() => removeTourney(gameId));
        }}
      >
        {pending ? 'Deleting…' : 'Delete tournament'}
      </button>
      {note && !note.ok ? <NoteText note={note} /> : null}
    </div>
  );
}
