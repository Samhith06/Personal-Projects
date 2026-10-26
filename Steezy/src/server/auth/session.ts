/**
 * Session handling (pattern from FTDWEBSITE).
 *
 * The browser only holds a signed, httpOnly cookie with the user id. Discord
 * and Kick tokens are used during the callback and then discarded.
 */
import 'server-only';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { users, type User } from '@/server/db/schema';
import { env } from '@/lib/env';

const COOKIE = 'steezy_session';
const ISSUER = 'steezespins';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secretKey() {
  const secret = env.authSecret;
  if (!secret) {
    if (env.isProd) throw new Error('AUTH_SECRET is required in production');
    return new TextEncoder().encode('steezy-development-only-secret-change-me');
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());

  const jar = await cookies();
  jar.set(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: env.isProd, path: '/', maxAge: MAX_AGE });
}

/**
 * Short-lived token proving a "link Telegram" request started on this member's
 * own /me page — without it, anyone could link their Telegram to a signed-in victim.
 */
export async function signLinkState(userId: string) {
  return new SignJWT({ sub: userId, purpose: 'telegram-link' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setExpirationTime('30m')
    .sign(secretKey());
}

export async function verifyLinkState(token: string | null, userId: string) {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { issuer: ISSUER });
    return payload.sub === userId && payload.purpose === 'telegram-link';
  } catch {
    return false;
  }
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

async function readSession(): Promise<{ userId: string; issuedAt: Date } | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { issuer: ISSUER });
    if (typeof payload.sub !== 'string') return null;
    return { userId: payload.sub, issuedAt: new Date((payload.iat ?? 0) * 1000) };
  } catch {
    return null;
  }
}

/** The signed-in user, or null. Read fresh so role changes apply at once. */
export async function getCurrentUser(): Promise<User | null> {
  const session = await readSession();
  if (!session) return null;
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  return user ?? null;
}

/** True when the member hasn't confirmed 18+ since this login. */
export async function needsAgeConfirmation(user: User | null): Promise<boolean> {
  if (!user) return false;
  const session = await readSession();
  if (!session) return false;
  if (!user.ageConfirmedAt) return true;
  return Math.floor(user.ageConfirmedAt.getTime() / 1000) < Math.floor(session.issuedAt.getTime() / 1000);
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error('UNAUTHENTICATED');
  return user;
}

export type Role = 'member' | 'mod' | 'admin' | 'owner';
const RANK: Record<Role, number> = { member: 0, mod: 1, admin: 2, owner: 3 };

export function hasRole(user: Pick<User, 'role'> | null, min: Role) {
  return Boolean(user) && RANK[(user!.role as Role) ?? 'member'] >= RANK[min];
}

/** Staff check for server actions and admin pages. Hiding a button is never the security boundary. */
export async function requireRole(min: Role): Promise<User> {
  const user = await requireUser();
  if (!hasRole(user, min)) throw new Error('FORBIDDEN');
  return user;
}

/** Role comes from env on every login — nobody can promote themselves. */
export function roleForDiscordId(discordId: string): Role {
  if (env.ownerDiscordIds.includes(discordId)) return 'owner';
  if (env.adminDiscordIds.includes(discordId)) return 'admin';
  if (env.modDiscordIds.includes(discordId)) return 'mod';
  return 'member';
}

/** Same rule for Telegram-only accounts (members who linked Discord get their Discord role). */
export function roleForTelegramId(telegramId: string): Role {
  if (env.ownerTelegramIds.includes(telegramId)) return 'owner';
  if (env.adminTelegramIds.includes(telegramId)) return 'admin';
  if (env.modTelegramIds.includes(telegramId)) return 'mod';
  return 'member';
}
