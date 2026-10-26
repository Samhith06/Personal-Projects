/**
 * Everything that happens when a chat message arrives from Kick's webhook:
 * `!verify` codes, watch time (only while live), giveaway `!join`, the bonus
 * hunt and slot tournament's `!sr` / `!gtb`, and bot commands.
 */
import { handleJoinCommand } from '@/server/services/giveaways';
import { handleVerifyCommand } from './chat-verification';
import { parseCommand, replyFor, takeCooldown } from './commands';
import { sendChat, type SendChat } from './bot';
import { handleHuntCommand, type HuntCommandOutcome } from './hunt-commands';
import { openSession } from './sessions';
import { recordChat, type ChatEvent } from './watchtime';

export type ChatOutcome = {
  verified: boolean;
  recorded: boolean;
  counted: boolean;
  joined: boolean;
  /** What `!sr` or `!gtb` did, if the message was one. */
  huntCommand: HuntCommandOutcome | null;
  reply: string | null;
};

export async function handleChatEvent(msg: ChatEvent, broadcasterUserId: string, send: SendChat = sendChat): Promise<ChatOutcome> {
  const outcome: ChatOutcome = { verified: false, recorded: false, counted: false, joined: false, huntCommand: null, reply: null };

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
  // `!sr Sweet Bonanza` (tournament first, else the hunt) and `!gtb 4200` — silent too; the overlays show them.
  outcome.huntCommand = await handleHuntCommand(msg);
  if (outcome.huntCommand) return outcome;

  const command = parseCommand(msg.content);
  if (command && takeCooldown(command, msg.senderId)) {
    outcome.reply = `@${msg.senderUsername} ${await replyFor(command, msg.senderId)}`;
    await send({ broadcasterUserId, content: outcome.reply, replyToMessageId: msg.messageId });
  }
  return outcome;
}
