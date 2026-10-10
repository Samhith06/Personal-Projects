/**
 * Server-side environment access.
 *
 * Nothing in here may be imported from a Client Component — secrets stay on
 * the server. Feature flags describe what is *configured*, so the UI can
 * degrade gracefully (e.g. show "Discord login unavailable" instead of a
 * button that leads to a broken OAuth screen).
 */
import 'server-only';

const str = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);

function parsePairs(value: string | undefined, requireChannel: boolean) {
  return (str(value) ?? '')
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [discordId, streamerId] = pair.split(':').map((v) => v.trim());
      return { discordId, streamerId: streamerId || null };
    })
    .filter((v) => v.discordId && (!requireChannel || v.streamerId));
}

export const env = {
  appUrl: str(process.env.APP_URL) ?? 'http://localhost:3000',
  authSecret: str(process.env.AUTH_SECRET),
  discordClientId: str(process.env.DISCORD_CLIENT_ID),
  discordClientSecret: str(process.env.DISCORD_CLIENT_SECRET),
  kickClientId: str(process.env.KICK_CLIENT_ID),
  kickClientSecret: str(process.env.KICK_CLIENT_SECRET),
  /** "discordId" or "discordId:streamerSlug" — master admins, optionally tied to their own channel. */
  adminDiscordIds: parsePairs(process.env.ADMIN_DISCORD_IDS, false),
  /** "discordId:streamerSlug" — creators who manage their own channel. */
  creatorDiscordIds: parsePairs(process.env.CREATOR_DISCORD_IDS, true),
  /** Stake.com affiliate API — feeds the Stake.com board. */
  stakeComApiKey: str(process.env.STAKE_COM_API_KEY),
  stakeComApiUrl: str(process.env.STAKE_COM_API_URL) ?? 'https://stake.com/_api/affiliate/referrals',
  /** Stake.eu affiliate API — feeds the Stake.eu board. */
  stakeEuApiKey: str(process.env.STAKE_EU_API_KEY),
  stakeEuApiUrl: str(process.env.STAKE_EU_API_URL) ?? 'https://stake.eu/_api/affiliate/referrals',
  /** Published CSV of the affiliate's wager sheet. Feeds the Stake.com board only while it has no API key. */
  leaderboardSheetUrl: str(process.env.LEADERBOARD_SHEET_URL),
  /** Only rows for this affiliate campaign are counted. */
  leaderboardCampaignCode: str(process.env.LEADERBOARD_CAMPAIGN_CODE) ?? 'FGDR',
  /** How often to re-pull the standings, in milliseconds. Defaults to 5 minutes. */
  leaderboardSyncIntervalMs: Number(process.env.LEADERBOARD_SYNC_INTERVAL_MS ?? 300_000),
  isProd: process.env.NODE_ENV === 'production',
};

export const features = {
  /** Real Discord OAuth is wired up. */
  discordAuth: Boolean(env.discordClientId && env.discordClientSecret),
  /** Kick account linking via OAuth is wired up. */
  kickAuth: Boolean(env.kickClientId && env.kickClientSecret),
  /** Live status comes from the Kick API rather than the mock provider. */
  kickApi: Boolean(env.kickClientId && env.kickClientSecret),
  /** Standings are pulled from Stake (or the sheet) rather than edited by hand. */
  leaderboardSync: Boolean(env.stakeComApiKey || env.stakeEuApiKey || env.leaderboardSheetUrl),
};

/**
 * Absolute URL for somewhere on this site.
 *
 * Built from `APP_URL` rather than the incoming request, because behind a proxy
 * the request's own host is the container's (`localhost:8080` on Railway) — a
 * redirect built from it sends the visitor to their own machine. Anything that
 * leaves the server as an absolute URL has to come from here.
 */
export function siteUrl(path: string) {
  return new URL(path, env.appUrl).toString();
}

/** Absolute URL for an OAuth redirect target. */
export const callbackUrl = siteUrl;
