/**
 * Session handling.
 *
 * The browser only ever holds a signed, httpOnly cookie containing the FGDR
 * user id. Discord/Kick OAuth tokens are used server-side during the callback
 * and then discarded — we store the identity, never the credentials.
 */
import 'server-only';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { memberProgress, users, type User } from '@/server/db/schema';
import { env } from '@/lib/env';

const COOKIE = 'fgdr_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secretKey() {
  const secret = env.authSecret;
  if (!secret) {
    if (env.isProd) throw new Error('AUTH_SECRET is required in production');
    // Development fallback so the app runs before secrets are configured.
    return new TextEncoder().encode('fgdr-development-only-secret-change-me');
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('fgdr')
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProd,
    path: '/',
    maxAge: MAX_AGE,
  });
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
    const { payload } = await jwtVerify(token, secretKey(), { issuer: 'fgdr' });
    if (typeof payload.sub !== 'string') return null;
    return { userId: payload.sub, issuedAt: new Date((payload.iat ?? 0) * 1000) };
  } catch {
    return null;
  }
}

/** The signed-in user, or null. Always read fresh so role changes apply at once. */
export async function getCurrentUser(): Promise<User | null> {
  const session = await readSession();
  if (!session) return null;
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  return user ?? null;
}

/**
 * True when the member hasn't confirmed their age since this login.
 * Every new sign-in (new session) asks again.
 */
export async function needsAgeConfirmation(user: User | null): Promise<boolean> {
  if (!user) return false;
  const session = await readSession();
  if (!session) return false;
  if (!user.ageConfirmedAt) return true;
  // Session iat has one-second precision; compare at the same resolution.
  return Math.floor(user.ageConfirmedAt.getTime() / 1000) < Math.floor(session.issuedAt.getTime() / 1000);
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error('UNAUTHENTICATED');
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== 'admin') throw new Error('FORBIDDEN');
  return user;
}

/** Wager progress for the member area (created lazily on first read). */
export async function getMemberProgress(userId: string) {
  const [row] = await db.select().from(memberProgress).where(eq(memberProgress.userId, userId)).limit(1);
  return row ?? { userId, totalWagered: 0, monthWagered: 0, updatedAt: new Date() };
}

/** Role assignment driven by environment configuration (no self-promotion). */
export function roleForDiscordId(discordId: string): { role: string; streamerId: string | null } {
  const admin = env.adminDiscordIds.find((a) => a.discordId === discordId);
  if (admin) return { role: 'admin', streamerId: admin.streamerId };
  const creator = env.creatorDiscordIds.find((c) => c.discordId === discordId);
  if (creator) return { role: 'creator', streamerId: creator.streamerId };
  return { role: 'member', streamerId: null };
}

export const SESSION_COOKIE = COOKIE;
