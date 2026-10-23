/**
 * Everything that happens when a chat message arrives from Kick's webhook:
 * `!verify` codes, watch time (only while live), giveaway `!join`, `!guess`,
 * `!sr` slot requests / tournament sign-ups and bot commands.
 */
import { handleJoinCommand } from '@/server/services/giveaways';
import { handleGuessCommand, type GuessResult } from '@/server/services/hunts';
import { handleVerifyCommand } from './chat-verification';
import { parseCommand, replyFor, takeCooldown } from './commands';
import { sendChat, type SendChat } from './bot';
import { handleSlotRequest } from './slot-requests';
import { openSession } from './sessions';
import { recordChat, type ChatEvent } from './watchtime';

export type ChatOutcome = {
  verified: boolean;
  recorded: boolean;
  counted: boolean;
  joined: boolean;
  guess: GuessResult | null;
  /** What `!sr` did, if the message was one, as `target:result`. */
  slotRequest: string | null;
  reply: string | null;
};

export async function handleChatEvent(msg: ChatEvent, broadcasterUserId: string, send: SendChat = sendChat): Promise<ChatOutcome> {
  const outcome: ChatOutcome = { verified: false, recorded: false, counted: false, joined: false, guess: null, slotRequest: null, reply: null };

  outcome.verified = await handleVerifyCommand(msg);

  const session = await openSession();
  if (session && msg.at >= session.startedAt) {
    const recorded = await recordChat(session.id, msg);
    // A webhook retry of a message we already have: don't answer it twice.
    if (!recorded) return outcome;
    outcome.recorded = true;
    outcome.counted = recorded.counted;
  }

  // `!join` (or a giveaway's own keyword) — silent: the overlay shows who joined, so chat isn't flooded with replies.
  const joins = await handleJoinCommand(msg.senderId, msg.content);
  outcome.joined = joins.some((j) => j.result === 'entered');
  // `!guess 4200` for the current bonus hunt — also silent; the hunt overlay shows the guess count.
  outcome.guess = await handleGuessCommand(msg.senderId, msg.content);

  // `!sr Sweet Bonanza`: tournament sign-up / slot change first, else a hunt suggestion. Answered, with a cooldown.
  const sr = await handleSlotRequest(msg.senderId, msg.senderUsername, msg.content);
  if (sr) {
    outcome.slotRequest = `${sr.target}:${sr.result}`;
    if (sr.reply) {
      outcome.reply = `@${msg.senderUsername} ${sr.reply}`;
      await send({ broadcasterUserId, content: outcome.reply, replyToMessageId: msg.messageId });
    }
    return outcome;
  }

  const command = parseCommand(msg.content);
  if (command && takeCooldown(command, msg.senderId)) {
    outcome.reply = `@${msg.senderUsername} ${await replyFor(command, msg.senderId)}`;
    await send({ broadcasterUserId, content: outcome.reply, replyToMessageId: msg.messageId });
  }
  return outcome;
}
