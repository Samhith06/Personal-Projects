import 'server-only';
import type { User } from '@/server/db/schema';
import type { SessionView } from '@/lib/nav';
import { discordAvatarUrl } from './discord';

export function toSessionView(user: User | null): SessionView {
  if (!user) return null;
  return {
    name: user.discordGlobalName || user.discordUsername,
    handle: user.discordUsername,
    avatarUrl: discordAvatarUrl(user.discordId, user.discordAvatar, 96),
    role: user.role,
  };
}
