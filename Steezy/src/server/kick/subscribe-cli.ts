/**
 * Subscribe Steezy's channel to the Kick webhook events this site uses.
 *
 *   npm run kick:subscribe
 *
 * Needs KICK_CLIENT_ID, KICK_CLIENT_SECRET and KICK_CHANNEL_SLUG. The webhook
 * URL itself (`${APP_URL}/api/webhooks/kick`) is set on the app in Kick's
 * developer settings; this registers which events to send for which channel.
 */
import 'dotenv/config';
import { KICK_API, KICK_TOKEN_URL } from '@/server/auth/kick';

const EVENTS = ['chat.message.sent', 'livestream.status.updated'];

async function appToken() {
  const res = await fetch(KICK_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.KICK_CLIENT_ID ?? '',
      client_secret: process.env.KICK_CLIENT_SECRET ?? '',
    }),
  });
  if (!res.ok) throw new Error(`Kick app token request failed (${res.status})`);
  return ((await res.json()) as { access_token: string }).access_token;
}

async function main() {
  const slug = process.env.KICK_CHANNEL_SLUG?.trim();
  if (!slug || !process.env.KICK_CLIENT_ID || !process.env.KICK_CLIENT_SECRET) {
    throw new Error('Set KICK_CLIENT_ID, KICK_CLIENT_SECRET and KICK_CHANNEL_SLUG in .env');
  }
  const token = await appToken();
  const auth = { Authorization: `Bearer ${token}`, Accept: 'application/json' };

  const ch = await fetch(`${KICK_API}/channels?slug=${encodeURIComponent(slug)}`, { headers: auth });
  if (!ch.ok) throw new Error(`Channel lookup failed (${ch.status})`);
  const channel = ((await ch.json()) as { data?: { broadcaster_user_id?: number }[] }).data?.[0];
  if (!channel?.broadcaster_user_id) throw new Error(`No Kick channel found for "${slug}"`);

  const res = await fetch(`${KICK_API}/events/subscriptions`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      broadcaster_user_id: channel.broadcaster_user_id,
      method: 'webhook',
      events: EVENTS.map((name) => ({ name, version: 1 })),
    }),
  });
  console.log(res.status, await res.text());
  process.exit(res.ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
