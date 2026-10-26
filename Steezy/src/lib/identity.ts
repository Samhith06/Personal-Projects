/**
 * Who a member is, whichever way they signed in (Discord, Telegram or both).
 * Pure helpers — no secrets, safe anywhere.
 */
import { discordAvatarUrl } from './discord';

export type Identity = {
  discordId: string | null;
  discordUsername: string | null;
  discordGlobalName: string | null;
  discordAvatar?: string | null;
  telegramId: string | null;
  telegramUsername: string | null;
  telegramName: string | null;
  telegramPhotoUrl?: string | null;
};

/** The login handle staff see: Discord username, else Telegram @username, else Telegram name. */
export function accountName(u: Partial<Identity>) {
  return u.discordUsername || u.telegramUsername || u.telegramName || 'member';
}

/** Friendly name for greetings and headers. */
export function displayName(u: Partial<Identity>) {
  return u.discordGlobalName || u.discordUsername || u.telegramName || u.telegramUsername || 'Member';
}

/** Which service the login handle comes from, for staff labels ("Discord bob" / "Telegram bob"). */
export function accountService(u: Partial<Identity>) {
  return u.discordId ? 'Discord' : 'Telegram';
}

export function avatarUrl(u: Partial<Identity>, size = 128) {
  if (u.discordId) return discordAvatarUrl(u.discordId, u.discordAvatar ?? null, size);
  if (u.telegramPhotoUrl) return u.telegramPhotoUrl;
  return 'https://cdn.discordapp.com/embed/avatars/0.png';
}
