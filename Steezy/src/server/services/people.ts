import { maskName } from '@/lib/format';

type Person = {
  kickUsername: string | null;
  discordGlobalName: string | null;
  discordUsername: string;
  nameOnLeaderboards: boolean;
};

/**
 * How a member appears in public lists (draw results, overlays): their Kick
 * name if linked — that's who chat knows — else their Discord name. Members who
 * turned off "show my name" are masked.
 */
export function publicName(p: Person) {
  const name = p.kickUsername || p.discordGlobalName || p.discordUsername;
  return p.nameOnLeaderboards ? name : maskName(name);
}

export const personColumns = {
  kickUsername: true,
  discordGlobalName: true,
  discordUsername: true,
  nameOnLeaderboards: true,
} as const;
