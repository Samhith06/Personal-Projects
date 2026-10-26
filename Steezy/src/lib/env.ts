/**
 * Server-side environment access.
 *
 * Never import this from a Client Component — secrets stay on the server.
 * `features` describes what is configured so the UI can degrade gracefully
 * ("Discord login unavailable") instead of sending people into a broken flow.
 */
import 'server-only';

const str = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);
const ids = (v: string | undefined) =>
  (str(v) ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const env = {
  appUrl: str(process.env.APP_URL) ?? 'http://localhost:3000',
  authSecret: str(process.env.AUTH_SECRET),

  ownerDiscordIds: ids(process.env.OWNER_DISCORD_IDS),
  adminDiscordIds: ids(process.env.ADMIN_DISCORD_IDS),
  modDiscordIds: ids(process.env.MOD_DISCORD_IDS),
  ownerTelegramIds: ids(process.env.OWNER_TELEGRAM_IDS),
  adminTelegramIds: ids(process.env.ADMIN_TELEGRAM_IDS),
  modTelegramIds: ids(process.env.MOD_TELEGRAM_IDS),

  discordClientId: str(process.env.DISCORD_CLIENT_ID),
  discordClientSecret: str(process.env.DISCORD_CLIENT_SECRET),
  discordInviteUrl: str(process.env.DISCORD_INVITE_URL) ?? 'https://discord.gg/PJpphDDS73',
  discordLiveWebhookUrl: str(process.env.DISCORD_LIVE_WEBHOOK_URL),

  /** From @BotFather. The bot's domain must be set to APP_URL's host with /setdomain. */
  telegramBotToken: str(process.env.TELEGRAM_BOT_TOKEN),
  /** Bot username without the @, used by the login widget. */
  telegramBotUsername: str(process.env.TELEGRAM_BOT_USERNAME)?.replace(/^@/, ''),

  kickClientId: str(process.env.KICK_CLIENT_ID),
  kickClientSecret: str(process.env.KICK_CLIENT_SECRET),
  kickChannelSlug: str(process.env.KICK_CHANNEL_SLUG),

  roobetApiUrl: str(process.env.ROOBET_API_URL) ?? 'https://roobetconnect.com/affiliate/v2/stats',
  roobetUserId: str(process.env.ROOBET_USER_ID),
  roobetApiKey: str(process.env.ROOBET_API_KEY),
  roobetReferralUrl: str(process.env.ROOBET_REFERRAL_URL) ?? 'https://roobet.com/?ref=STZY',
  roobetSyncIntervalMs: Number(process.env.ROOBET_SYNC_INTERVAL_MS ?? 600_000),

  isProd: process.env.NODE_ENV === 'production',
};

export const features = {
  discordAuth: Boolean(env.discordClientId && env.discordClientSecret),
  telegramAuth: Boolean(env.telegramBotToken && env.telegramBotUsername),
  kickAuth: Boolean(env.kickClientId && env.kickClientSecret),
  roobetSync: Boolean(env.roobetUserId && env.roobetApiKey),
};

/**
 * Absolute URL on this site, built from APP_URL rather than the request —
 * behind a proxy the request host is the container's own.
 */
export function siteUrl(path: string) {
  return new URL(path, env.appUrl).toString();
}
