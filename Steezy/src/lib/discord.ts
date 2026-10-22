/** Pure Discord helpers (no secrets, safe anywhere). */

const DISCORD_EPOCH = 1420070400000n;

/** When a Discord account was created, from its snowflake id (for "account older than N days" rules). */
export function discordAccountCreatedAt(discordId: string) {
  return new Date(Number((BigInt(discordId) >> 22n) + DISCORD_EPOCH));
}

export function discordAvatarUrl(discordId: string, hash: string | null, size = 128) {
  if (!hash) return `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(discordId) >> 22n) % 6n)}.png`;
  const ext = hash.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${discordId}/${hash}.${ext}?size=${size}`;
}
