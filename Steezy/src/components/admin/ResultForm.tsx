import { recordResultAction } from '@/server/actions/hunts';
import type { Match } from '@/server/services/tournaments';

/** Enter one buy per player — cost and payout — for a match. Used on the tournament screen and the dashboard. */
export function ResultForm({ match, tournamentId, back }: { match: Match; tournamentId: string; back?: string }) {
  const side = (key: 'A' | 'B', player: string | null) => (
    <fieldset className="result-form__side">
      <legend>{player}</legend>
      <label className="visually-hidden" htmlFor={`cost${key}-${match.id}`}>
        {player} buy cost
      </label>
      <input id={`cost${key}-${match.id}`} name={`cost${key}`} className="input" inputMode="decimal" placeholder="Cost $" required />
      <label className="visually-hidden" htmlFor={`payout${key}-${match.id}`}>
        {player} payout
      </label>
      <input id={`payout${key}-${match.id}`} name={`payout${key}`} className="input" inputMode="decimal" placeholder="Paid $" required />
    </fieldset>
  );
  return (
    <form action={recordResultAction} className="result-form">
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <input type="hidden" name="matchId" value={match.id} />
      {back ? <input type="hidden" name="back" value={back} /> : null}
      {side('A', match.playerA)}
      {side('B', match.playerB)}
      <button className="btn btn--primary" type="submit">
        Save result
      </button>
    </form>
  );
}
