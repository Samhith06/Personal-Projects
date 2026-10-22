/**
 * Kick OAuth 2.1 (authorization code + PKCE), from FTDWEBSITE.
 *
 * Used twice: members link their Kick account (`user:read`), and the owner
 * connects the chat bot account (`user:read chat:write`, see kick/bot.ts).
 */
import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { recomputeForKickUser } from '@/server/kick/watchtime';

const AUTHORIZE = 'https://id.kick.com/oauth/authorize';
export const KICK_TOKEN_URL = 'https://id.kick.com/oauth/token';
export const KICK_API = 'https://api.kick.com/public/v1';

export const KICK_REDIRECT_PATH = '/api/auth/kick/callback';

const appUrl = () => process.env.APP_URL?.trim() || 'http://localhost:3000';
const redirectUri = (path: string) => new URL(path, appUrl()).toString();

export function kickAuthorizeUrl(state: string, challenge: string, scope = 'user:read', redirectPath = KICK_REDIRECT_PATH) {
  const url = new URL(AUTHORIZE);
  url.searchParams.set('client_id', process.env.KICK_CLIENT_ID ?? '');
  url.searchParams.set('redirect_uri', redirectUri(redirectPath));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scope);
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

export type KickTokens = { accessToken: string; refreshToken: string | null; expiresAt: number };

async function tokenRequest(params: Record<string, string>): Promise<KickTokens> {
  const res = await fetch(KICK_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.KICK_CLIENT_ID ?? '',
      client_secret: process.env.KICK_CLIENT_SECRET ?? '',
      ...params,
    }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Kick token request failed (${res.status})`);
  const json = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error('Kick token response had no access token');
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
}

export function exchangeKickTokens(code: string, verifier: string, redirectPath = KICK_REDIRECT_PATH) {
  return tokenRequest({ grant_type: 'authorization_code', redirect_uri: redirectUri(redirectPath), code_verifier: verifier, code });
}

export function refreshKickTokens(refreshToken: string) {
  return tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken });
}

export type KickIdentity = { userId: string; username: string };

export async function fetchKickMe(accessToken: string): Promise<KickIdentity> {
  const res = await fetch(`${KICK_API}/users`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Kick profile lookup failed (${res.status})`);
  const payload = (await res.json()) as { data?: { user_id?: number | string; name?: string }[] };
  const me = payload.data?.[0];
  if (!me?.user_id) throw new Error('Kick profile lookup returned no user');
  return { userId: String(me.user_id), username: me.name ?? '' };
}

/** Member linking: the token is used once to read the identity and then dropped. */
export async function exchangeKickCode(code: string, verifier: string): Promise<KickIdentity> {
  const tokens = await exchangeKickTokens(code, verifier);
  return fetchKickMe(tokens.accessToken);
}

export type LinkResult = 'linked' | 'taken';

/**
 * Attach a Kick identity to a member. One Kick account per member, enforced
 * here and by a unique index. Watch time from streams they already chatted in
 * is credited straight away.
 */
export async function linkKickAccount(userId: string, kick: KickIdentity, method: 'oauth' | 'chat'): Promise<LinkResult> {
  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.kickUserId, kick.userId), ne(users.id, userId)))
    .limit(1);
  if (taken) return 'taken';

  const now = new Date();
  await db
    .update(users)
    .set({ kickUserId: kick.userId, kickUsername: kick.username, kickLinkMethod: method, kickLinkedAt: now, updatedAt: now })
    .where(eq(users.id, userId));
  await recomputeForKickUser(kick.userId);
  return 'linked';
}
