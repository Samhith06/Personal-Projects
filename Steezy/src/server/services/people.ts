import { sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { users } from '@/server/db/schema';
import { maskName } from '@/lib/format';

type Person = {
  kickUsername: string | null;
  discordGlobalName: string | null;
  discordUsername: string | null;
  telegramName: string | null;
  telegramUsername: string | null;
  nameOnLeaderboards: boolean;
};

/**
 * How a member appears in public lists (draw results, overlays): their Kick
 * name if linked — that's who chat knows — else their Discord name, else their
 * Telegram name. Members who turned off "show my name" are masked.
 */
export function publicName(p: Person) {
  const name = p.kickUsername || p.discordGlobalName || p.discordUsername || p.telegramName || p.telegramUsername || 'Member';
  return p.nameOnLeaderboards ? name : maskName(name);
}

type UserTable = { discordUsername: AnyPgColumn; telegramUsername: AnyPgColumn; telegramName: AnyPgColumn };

/** Staff-facing login name in SQL: Discord username, else Telegram @username, else Telegram name. */
export const accountNameSql = (t: UserTable = users) =>
  sql<string>`coalesce(${t.discordUsername}, '@' || ${t.telegramUsername}, ${t.telegramName})`;

/** Same, prefixed with the service ("Discord bob", "Telegram @bob") for review queues. */
export const accountLabelSql = (t: UserTable = users) =>
  sql<string>`case when ${t.discordUsername} is not null then 'Discord ' || ${t.discordUsername}
    else 'Telegram ' || coalesce('@' || ${t.telegramUsername}, ${t.telegramName}, '') end`;

/** The columns `publicName` and `handleFor` need, for spreading into a select. */
export const personFields = {
  kickUsername: users.kickUsername,
  discordGlobalName: users.discordGlobalName,
  discordUsername: users.discordUsername,
  telegramName: users.telegramName,
  telegramUsername: users.telegramUsername,
  telegramId: users.telegramId,
  nameOnLeaderboards: users.nameOnLeaderboards,
};
