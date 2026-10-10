/**
 * Discord OAuth2 — the only way into an FGDR account.
 *
 * Scope requested: `identify` only. We read the account id, username and
 * avatar hash, store those, and throw the access token away. No email, no
 * guilds, no connections, no refresh token stored.
 */
import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { env, callbackUrl } from '@/lib/env';
import { roleForDiscordId } from './session';

const AUTHORIZE = 'https://discord.com/oauth2/authorize';
const TOKEN = 'https://discord.com/api/oauth2/token';
const ME = 'https://discord.com/api/users/@me';

export const DISCORD_REDIRECT_PATH = '/api/auth/discord/callback';

export function discordAuthorizeUrl(state: string) {
  const url = new URL(AUTHORIZE);
  url.searchParams.set('client_id', env.discordClientId ?? '');
  url.searchParams.set('redirect_uri', callbackUrl(DISCORD_REDIRECT_PATH));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'identify');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'none');
  return url.toString();
}

type DiscordProfile = {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
};

export async function exchangeDiscordCode(code: string): Promise<DiscordProfile> {
  const body = new URLSearchParams({
    client_id: env.discordClientId ?? '',
    client_secret: env.discordClientSecret ?? '',
    grant_type: 'authorization_code',
    code,
    redirect_uri: callbackUrl(DISCORD_REDIRECT_PATH),
  });

  const tokenRes = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });
  if (!tokenRes.ok) throw new Error(`Discord token exchange failed (${tokenRes.status})`);
  const token = (await tokenRes.json()) as { access_token?: string };
  if (!token.access_token) throw new Error('Discord token exchange returned no access token');

  const meRes = await fetch(ME, {
    headers: { Authorization: `Bearer ${token.access_token}` },
    cache: 'no-store',
  });
  if (!meRes.ok) throw new Error(`Discord profile lookup failed (${meRes.status})`);
  return (await meRes.json()) as DiscordProfile;
}

/** Create or refresh the FGDR account behind a Discord identity. */
export async function upsertDiscordUser(profile: DiscordProfile) {
  const { role, streamerId } = roleForDiscordId(profile.id);
  const nowDate = new Date();

  const [existing] = await db.select().from(users).where(eq(users.discordId, profile.id)).limit(1);

  if (existing) {
    await db
      .update(users)
      .set({
        discordUsername: profile.username,
        discordGlobalName: profile.global_name,
        discordAvatar: profile.avatar,
        role,
        streamerId,
        updatedAt: nowDate,
        lastSeenAt: nowDate,
      })
      .where(eq(users.id, existing.id));
    return existing.id;
  }

  const id = `usr_${crypto.randomUUID()}`;
  await db.insert(users).values({
    id,
    discordId: profile.id,
    discordUsername: profile.username,
    discordGlobalName: profile.global_name,
    discordAvatar: profile.avatar,
    role,
    streamerId,
  });
  return id;
}

/** CDN URL for a Discord avatar hash (or the default avatar). */
export function discordAvatarUrl(discordId: string, hash: string | null, size = 128) {
  if (!hash) {
    const index = (BigInt(discordId) >> 22n) % 6n;
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
  }
  const ext = hash.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${discordId}/${hash}.${ext}?size=${size}`;
}
