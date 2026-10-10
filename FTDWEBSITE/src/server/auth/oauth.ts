/**
 * Small OAuth2 helpers shared by the Discord and Kick flows.
 *
 * State (CSRF) and PKCE verifiers live in short-lived httpOnly cookies — they
 * never reach client JavaScript, and they are cleared as soon as the callback
 * consumes them.
 */
import 'server-only';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';

const FIVE_MINUTES = 60 * 5;

export const b64url = (buf: Buffer) => buf.toString('base64url');

export function randomToken(bytes = 32) {
  return b64url(randomBytes(bytes));
}

/** RFC 7636 S256 challenge for the given verifier. */
export function codeChallenge(verifier: string) {
  return b64url(createHash('sha256').update(verifier).digest());
}

export async function setFlowCookie(name: string, value: string) {
  const jar = await cookies();
  jar.set(name, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProd,
    path: '/',
    maxAge: FIVE_MINUTES,
  });
}

export async function takeFlowCookie(name: string) {
  const jar = await cookies();
  const value = jar.get(name)?.value ?? null;
  if (value) jar.delete(name);
  return value;
}

/** Constant-time comparison for OAuth `state`. */
export function safeEqual(a: string | null, b: string | null) {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Only ever redirect back to a path on this site. */
export function safeReturnTo(value: string | null | undefined, fallback = '/dashboard') {
  if (!value) return fallback;
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  return value;
}
