/**
 * Kick integration.
 *
 * Two separate concerns live here:
 *
 *  1. Account linking — Kick OAuth 2.1 (authorization code + PKCE) so a member
 *     proves they own the Kick account instead of typing a username we would
 *     have to take on trust.
 *  2. Live status — an app access token (client credentials) used by the live
 *     service to read public channel state. Credentials never leave the server.
 */
import 'server-only';
import { env, callbackUrl } from '@/lib/env';

const AUTHORIZE = 'https://id.kick.com/oauth/authorize';
const TOKEN = 'https://id.kick.com/oauth/token';
const API = 'https://api.kick.com/public/v1';

export const KICK_REDIRECT_PATH = '/api/auth/kick/callback';

export function kickAuthorizeUrl(state: string, challenge: string) {
  const url = new URL(AUTHORIZE);
  url.searchParams.set('client_id', env.kickClientId ?? '');
  url.searchParams.set('redirect_uri', callbackUrl(KICK_REDIRECT_PATH));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'user:read');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

export type KickIdentity = { userId: string; username: string; avatarUrl: string | null };

export async function exchangeKickCode(code: string, verifier: string): Promise<KickIdentity> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: env.kickClientId ?? '',
    client_secret: env.kickClientSecret ?? '',
    redirect_uri: callbackUrl(KICK_REDIRECT_PATH),
    code_verifier: verifier,
    code,
  });

  const tokenRes = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });
  if (!tokenRes.ok) throw new Error(`Kick token exchange failed (${tokenRes.status})`);
  const token = (await tokenRes.json()) as { access_token?: string };
  if (!token.access_token) throw new Error('Kick token exchange returned no access token');

  const meRes = await fetch(`${API}/users`, {
    headers: { Authorization: `Bearer ${token.access_token}`, Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!meRes.ok) throw new Error(`Kick profile lookup failed (${meRes.status})`);

  const payload = (await meRes.json()) as {
    data?: { user_id?: number | string; name?: string; profile_picture?: string }[];
  };
  const me = payload.data?.[0];
  if (!me?.user_id) throw new Error('Kick profile lookup returned no user');

  return {
    userId: String(me.user_id),
    username: me.name ?? '',
    avatarUrl: me.profile_picture ?? null,
  };
}

/* ------------------------------------------------------------------ app token */

let appToken: { value: string; expiresAt: number } | null = null;

async function getAppToken(): Promise<string | null> {
  if (!env.kickClientId || !env.kickClientSecret) return null;
  if (appToken && appToken.expiresAt > Date.now() + 30_000) return appToken.value;

  const res = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.kickClientId,
      client_secret: env.kickClientSecret,
    }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Kick app token request failed (${res.status})`);
  const json = (await res.json()) as { access_token: string; expires_in?: number };
  appToken = {
    value: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return appToken.value;
}

export type KickChannel = {
  slug: string;
  isLive: boolean;
  title: string | null;
  viewers: number | null;
  category: string | null;
  thumbnailUrl: string | null;
  startedAt: string | null;
  followers: number | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
};

/**
 * Public channel state for up to 50 slugs in one request.
 * Returns null when Kick is not configured so callers can fall back.
 */
export async function fetchKickChannels(slugs: string[]): Promise<KickChannel[] | null> {
  const token = await getAppToken();
  if (!token) return null;

  const url = new URL(`${API}/channels`);
  slugs.forEach((slug) => url.searchParams.append('slug', slug));

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    // The live service owns caching; this call is always fresh.
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Kick channels request failed (${res.status})`);

  const json = (await res.json()) as {
    data?: {
      slug: string;
      stream_title?: string;
      banner_picture?: string;
      category?: { name?: string };
      stream?: { is_live?: boolean; viewer_count?: number; start_time?: string; thumbnail?: string };
    }[];
  };

  return (json.data ?? []).map((c) => ({
    slug: c.slug,
    isLive: Boolean(c.stream?.is_live),
    title: c.stream_title ?? null,
    viewers: c.stream?.viewer_count ?? null,
    category: c.category?.name ?? null,
    thumbnailUrl: c.stream?.thumbnail ?? null,
    startedAt: c.stream?.start_time ?? null,
    followers: null,
    avatarUrl: null,
    bannerUrl: c.banner_picture ?? null,
  }));
}

/** Embed URL for a channel's live player (used by the live hub). */
export const kickPlayerUrl = (slug: string, parent?: string) =>
  `https://player.kick.com/${encodeURIComponent(slug)}${parent ? `?parent=${encodeURIComponent(parent)}` : ''}`;
