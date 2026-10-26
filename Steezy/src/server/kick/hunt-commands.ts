/**
 * `!sr` and `!gtb` from Kick chat (as on MattySpins).
 *
 * `!sr <slot>` goes to the slot tournament while one is live (sign-ups, or a
 * player still in changing their slot), else to the bonus hunt's request
 * queue. `!gtb <amount>` (or `!guess`) guesses the hunt's final balance.
 * Both are silent: the admin screen and the overlays show what landed.
 */
import { parseHuntCommand } from '@/lib/hunt-commands';
import { submitGuess, submitRequest } from '@/server/services/hunts';
import { liveTourney, submitTourneyRequest } from '@/server/services/tourney';

export type HuntCommandOutcome = { kind: 'request' | 'guess'; ok: boolean; detail: string };

export async function handleHuntCommand(message: { senderId: string; senderUsername: string; content: string }): Promise<HuntCommandOutcome | null> {
  const command = parseHuntCommand(message.content);
  if (!command) return null;
  const sender = { kickUserId: message.senderId, kickUsername: message.senderUsername };
  try {
    const outcome =
      command.kind === 'guess'
        ? await submitGuess({ ...sender, amount: command.amount })
        : (await liveTourney())
          ? await submitTourneyRequest({ ...sender, query: command.slot })
          : await submitRequest({ ...sender, query: command.slot });
    const detail = outcome.ok ? outcome.detail : `refused (${outcome.reason})`;
    console.log(`[kick] ${command.kind} from ${message.senderUsername}: ${detail}`);
    return { kind: command.kind, ok: outcome.ok, detail };
  } catch (error) {
    console.error(`[kick] ${command.kind} from ${message.senderUsername} failed`, error);
    return { kind: command.kind, ok: false, detail: 'failed' };
  }
}
