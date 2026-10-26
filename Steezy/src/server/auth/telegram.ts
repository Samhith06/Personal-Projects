/**
 * Telegram Login Widget — the other way into a SteezySpins account.
 *
 * The widget sends the member back to our callback with their profile and a
 * hash. The hash is HMAC-SHA256 over the sorted fields, keyed with
 * SHA256(bot token), so only Telegram can produce it. We keep the id, names and
 * photo URL; there is no token to throw away.
 * https://core.telegram.org/widgets/login#checking-authorization
 */
import 'server-only';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { env } from '@/lib/env';
import { roleForTelegramId } from './session';

export const TELEGRAM_CALLBACK_PATH = '/api/auth/telegram/callback';

/** Signed fields Telegram sends. Anything else on the URL (our own `returnTo`, `link`) is not part of the hash. */
const FIELDS = ['id', 'first_name', 'last_name', 'username', 'photo_url', 'auth_date'] as const;

/** A login payload is accepted for this long after Telegram signed it. */
const MAX_AGE_SECONDS = 60 * 10;

export type TelegramProfile = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  photoUrl: string | null;
};

/** Check the widget's hash and freshness. Returns the profile, or null if it isn't genuine. */
export function verifyTelegramLogin(params: URLSearchParams): TelegramProfile | null {
  const token = env.telegramBotToken;
  const hash = params.get('hash');
  const id = params.get('id');
  const authDate = Number(params.get('auth_date'));
  if (!token || !hash || !id || !Number.isFinite(authDate)) return null;

  const dataCheck = FIELDS.filter((k) => params.has(k))
    .sort()
    .map((k) => `${k}=${params.get(k)}`)
    .join('\n');
  const secret = createHash('sha256').update(token).digest();
  const expected = createHmac('sha256', secret).update(dataCheck).digest();
  const given = Buffer.from(hash, 'hex');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  const age = Date.now() / 1000 - authDate;
  if (age > MAX_AGE_SECONDS || age < -60) return null;

  return {
    id,
    firstName: params.get('first_name'),
    lastName: params.get('last_name'),
    username: params.get('username'),
    photoUrl: params.get('photo_url'),
  };
}

function profileColumns(p: TelegramProfile) {
  const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || null;
  return { telegramUsername: p.username, telegramName: name, telegramPhotoUrl: p.photoUrl };
}

/**
 * Sign in with Telegram: the account that has this Telegram linked, or a new
 * Telegram-only account. Returns the user id.
 */
export async function upsertTelegramUser(profile: TelegramProfile) {
  const now = new Date();
  const [existing] = await db.select().from(users).where(eq(users.telegramId, profile.id)).limit(1);
  if (existing) {
    // A linked Discord keeps deciding the role; Telegram-only accounts use the Telegram id lists.
    const role = existing.discordId ? existing.role : roleForTelegramId(profile.id);
    await db
      .update(users)
      .set({ ...profileColumns(profile), role, updatedAt: now, lastSeenAt: now })
      .where(eq(users.id, existing.id));
    return existing.id;
  }
  const [row] = await db
    .insert(users)
    .values({ telegramId: profile.id, telegramLinkedAt: now, role: roleForTelegramId(profile.id), ...profileColumns(profile) })
    .returning({ id: users.id });
  return row.id;
}

/**
 * Attach Telegram to the signed-in account so either login works.
 * Returns false when that Telegram account already belongs to someone else.
 */
export async function linkTelegram(userId: string, profile: TelegramProfile) {
  const [owner] = await db.select({ id: users.id }).from(users).where(eq(users.telegramId, profile.id)).limit(1);
  if (owner && owner.id !== userId) return false;
  await db
    .update(users)
    .set({ telegramId: profile.id, telegramLinkedAt: new Date(), ...profileColumns(profile), updatedAt: new Date() })
    .where(eq(users.id, userId));
  return true;
}
