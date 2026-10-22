/**
 * The chat bot's Kick account.
 *
 * The owner connects a Kick account (Steezy's own, or a dedicated bot account)
 * once from the admin dashboard with `chat:write`. Its tokens live in the
 * `settings` table and are refreshed automatically; replies are posted with
 * Kick's public chat API. Without a connected account, commands are still
 * handled but replies are only logged.
 */
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { settings } from '@/server/db/schema';
import { KICK_API, refreshKickTokens, type KickTokens } from '@/server/auth/kick';

const KEY = 'kick.bot';

export type BotAccount = KickTokens & { userId: string; username: string; connectedAt: string };

export async function getBotAccount(): Promise<BotAccount | null> {
  const [row] = await db.select().from(settings).where(eq(settings.key, KEY)).limit(1);
  return (row?.value as BotAccount | undefined) ?? null;
}

export async function saveBotAccount(account: BotAccount) {
  await db
    .insert(settings)
    .values({ key: KEY, value: account })
    .onConflictDoUpdate({ target: settings.key, set: { value: account, updatedAt: new Date() } });
}

export async function disconnectBot() {
  await db.delete(settings).where(eq(settings.key, KEY));
}

let refreshing: Promise<BotAccount | null> | null = null;

/** A usable access token, refreshing it (once, even under concurrent calls) when it's about to expire. */
async function botToken(): Promise<string | null> {
  const account = await getBotAccount();
  if (!account) return null;
  if (account.expiresAt > Date.now() + 60_000) return account.accessToken;
  if (!account.refreshToken) return null;

  refreshing ??= (async () => {
    try {
      const tokens = await refreshKickTokens(account.refreshToken!);
      const next = { ...account, ...tokens, refreshToken: tokens.refreshToken ?? account.refreshToken };
      await saveBotAccount(next);
      return next;
    } catch (error) {
      console.error('[kick-bot] token refresh failed — reconnect the bot in /admin', error);
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return (await refreshing)?.accessToken ?? null;
}

/** Kick chat messages are capped at 500 characters. */
const MAX_LEN = 500;

export type SendChat = (args: { broadcasterUserId: string; content: string; replyToMessageId?: string }) => Promise<boolean>;

export const sendChat: SendChat = async ({ broadcasterUserId, content, replyToMessageId }) => {
  const token = await botToken();
  const text = content.length > MAX_LEN ? `${content.slice(0, MAX_LEN - 1)}…` : content;
  if (!token) {
    console.info(`[kick-bot] (no bot connected) would reply: ${text}`);
    return false;
  }
  try {
    const res = await fetch(`${KICK_API}/chat`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        type: 'user',
        broadcaster_user_id: Number(broadcasterUserId),
        content: text,
        ...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.warn(`[kick-bot] chat send failed (${res.status}) ${await res.text().catch(() => '')}`);
    return res.ok;
  } catch (error) {
    console.warn('[kick-bot] chat send failed', error);
    return false;
  }
};
