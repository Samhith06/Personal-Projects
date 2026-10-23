/**
 * `!sr <slot name>` in Kick chat.
 *
 * A tournament that's taking sign-ups (or is live and taking slot changes)
 * comes first; otherwise the suggestion goes to the bonus hunt being
 * collected. Each viewer gets at most one reply per cooldown so chat stays
 * readable; the request itself still counts.
 */
import { activeHunt } from '@/server/services/hunts';
import { MAX_PENDING_PER_VIEWER, requestSlot, type RequestResult } from '@/server/services/hunt-requests';
import { chatSignUp, openForRequests, type SignUpResult } from '@/server/services/tournaments';

/** Longer than any real slot name; stops a pasted paragraph becoming a request. */
const MAX_SLOT_LENGTH = 60;
const COOLDOWN_MS = 10_000;

/** The slot named after `!sr`, tidied, or null when the message isn't a usable request. */
export function parseSlotRequest(content: string): string | null {
  const m = /^!sr\s+(.+)$/i.exec(content.trim());
  if (!m) return null;
  const slot = m[1].replace(/\s+/g, ' ').trim();
  if (!/[a-z0-9]/i.test(slot) || slot.length > MAX_SLOT_LENGTH) return null;
  return slot;
}

function tournamentReply(name: string, r: SignUpResult) {
  switch (r.result) {
    case 'entered':
      return `you're in ${name} with ${r.slot} (${r.count} signed up for ${r.size} places — the bracket is drawn at random).`;
    case 'changed':
      return `your slot for ${name} is now ${r.slot}.`;
    case 'full':
      return `sign-ups for ${name} are full.`;
    case 'out':
      return `you're not in ${name} any more — slot changes are for players still in.`;
    default:
      return `sign-ups for ${name} are closed.`;
  }
}

function huntReply(result: RequestResult, slot: string) {
  switch (result) {
    case 'added':
      return `${slot} is on the suggestion list for the hunt.`;
    case 'duplicate':
      return `you already suggested ${slot}.`;
    case 'limit':
      return `you have ${MAX_PENDING_PER_VIEWER} suggestions waiting already — wait for those to be picked.`;
    default:
      return 'slot suggestions are closed for this hunt.';
  }
}

const g = globalThis as unknown as { steezySrCooldowns?: Map<string, number> };
const cooldowns = (g.steezySrCooldowns ??= new Map());

export type SlotRequestOutcome = { target: 'tournament' | 'hunt' | 'none'; result: string; reply: string | null };

export async function handleSlotRequest(kickUserId: string, kickUsername: string, content: string, now = Date.now()): Promise<SlotRequestOutcome | null> {
  const slot = parseSlotRequest(content);
  if (!slot) return null;
  const quiet = (cooldowns.get(kickUserId) ?? 0) > now;
  if (!quiet) cooldowns.set(kickUserId, now + COOLDOWN_MS);
  if (cooldowns.size > 5000) for (const [k, until] of cooldowns) if (until <= now) cooldowns.delete(k);

  const tournament = await openForRequests();
  if (tournament) {
    const r = await chatSignUp(tournament, kickUserId, kickUsername, slot);
    return { target: 'tournament', result: r.result, reply: quiet ? null : tournamentReply(tournament.name, r) };
  }

  const hunt = await activeHunt();
  if (hunt) {
    const result = await requestSlot(hunt, kickUserId, kickUsername, slot);
    return { target: 'hunt', result, reply: quiet ? null : huntReply(result, slot) };
  }

  return { target: 'none', result: 'closed', reply: quiet ? null : 'no hunt or tournament is taking slots right now.' };
}
