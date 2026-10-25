import { resolvePayout } from '@/server/actions/payouts';
import { ConfirmSubmit } from './ConfirmSubmit';

/** Deny and Delete buttons for one row in the Payouts queue. */
export function PayoutActions({ kind, id, place, label }: { kind: 'milestone' | 'leaderboard' | 'raffle' | 'giveaway'; id: string; place?: number; label: string }) {
  return (
    <>
      <form action={resolvePayout}>
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="place" value={place ?? ''} />
        <input type="hidden" name="op" value="deny" />
        <ConfirmSubmit className="btn btn--secondary" message={`Deny ${label}? The prize is forfeited and leaves the queue.`}>
          Deny
        </ConfirmSubmit>
      </form>
      <form action={resolvePayout}>
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="place" value={place ?? ''} />
        <input type="hidden" name="op" value="delete" />
        <ConfirmSubmit className="btn btn--danger" message={`Delete ${label}? The record is removed for good.`}>
          Delete
        </ConfirmSubmit>
      </form>
    </>
  );
}
