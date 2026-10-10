/**
 * Admin-panel permissions.
 *
 *   master (role 'admin')   FatGuysDontRun, Insane Tigers 7 and DaddyKong
 *                           Gaming. Everything, all channels, plus site-wide
 *                           sections.
 *   creator (role 'creator') Still Making Gains + Dallas Ghost. Their own
 *                           channel only: profile, clips, wins, giveaways,
 *                           raffles and challenges they host.
 *
 * Every server action re-checks these rules; hiding a button is never the
 * security boundary.
 */
import 'server-only';
import { getCurrentUser } from './session';
import type { User } from '@/server/db/schema';

export type Staff = {
  user: User;
  isMaster: boolean;
  /** The staff member's own channel, if any. */
  ownChannel: string | null;
};

export async function getStaff(): Promise<Staff | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role === 'admin') return { user, isMaster: true, ownChannel: user.streamerId };
  if (user.role === 'creator' && user.streamerId) return { user, isMaster: false, ownChannel: user.streamerId };
  return null;
}

export class PermissionError extends Error {}

export async function requireStaff(): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) throw new PermissionError('Admin access only.');
  return staff;
}

export async function requireMaster(): Promise<Staff> {
  const staff = await requireStaff();
  if (!staff.isMaster) throw new PermissionError('Only master admins can do that.');
  return staff;
}

export function canManageChannel(staff: Staff, streamerId: string | null | undefined) {
  if (staff.isMaster) return true;
  return Boolean(streamerId) && streamerId === staff.ownChannel;
}

export function assertChannel(staff: Staff, streamerId: string | null | undefined) {
  if (!canManageChannel(staff, streamerId)) {
    throw new PermissionError('You can only manage your own channel.');
  }
}

/** Channel filter for list queries: undefined = all channels. */
export function channelScope(staff: Staff): string | undefined {
  return staff.isMaster ? undefined : (staff.ownChannel ?? '__none__');
}
