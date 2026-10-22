/**
 * Discord OAuth2 — the only way into a SteezeSpins account.
 *
 * Scope: `identify`. We keep the id, username and avatar hash and throw the
 * access token away.
 */
import 'server-only';
import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { env, siteUrl } from '@/lib/env';
import { roleForDiscordId } from './session';

const AUTHORIZE = 'https://discord.com/oauth2/authorize';
const TOKEN = 'https://discord.com/api/oauth2/token';
const ME = 'https://discord.com/api/users/@me';

export const DISCORD_REDIRECT_PATH = '/api/auth/discord/callback';

export function discordAuthorizeUrl(state: string) {
  const url = new URL(AUTHORIZE);
  url.searchParams.set('client_id', env.discordClientId ?? '');
  url.searchParams.set('redirect_uri', siteUrl(DISCORD_REDIRECT_PATH));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'identify');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'none');
  return url.toString();
}

type DiscordProfile = { id: string; username: string; global_name: string | null; avatar: string | null };

export async function exchangeDiscordCode(code: string): Promise<DiscordProfile> {
  const tokenRes = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.discordClientId ?? '',
      client_secret: env.discordClientSecret ?? '',
      grant_type: 'authorization_code',
      code,
      redirect_uri: siteUrl(DISCORD_REDIRECT_PATH),
    }),
    cache: 'no-store',
  });
  if (!tokenRes.ok) throw new Error(`Discord token exchange failed (${tokenRes.status})`);
  const token = (await tokenRes.json()) as { access_token?: string };
  if (!token.access_token) throw new Error('Discord token exchange returned no access token');

  const meRes = await fetch(ME, { headers: { Authorization: `Bearer ${token.access_token}` }, cache: 'no-store' });
  if (!meRes.ok) throw new Error(`Discord profile lookup failed (${meRes.status})`);
  return (await meRes.json()) as DiscordProfile;
}

/** Create or refresh the account behind a Discord identity. Returns the user id. */
export async function upsertDiscordUser(profile: DiscordProfile) {
  const role = roleForDiscordId(profile.id);
  const now = new Date();
  const [row] = await db
    .insert(users)
    .values({
      discordId: profile.id,
      discordUsername: profile.username,
      discordGlobalName: profile.global_name,
      discordAvatar: profile.avatar,
      role,
    })
    .onConflictDoUpdate({
      target: users.discordId,
      set: {
        discordUsername: profile.username,
        discordGlobalName: profile.global_name,
        discordAvatar: profile.avatar,
        role,
        updatedAt: now,
        lastSeenAt: now,
      },
    })
    .returning({ id: users.id });
  return row.id;
}

