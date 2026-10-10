import 'server-only';
import { redirect } from 'next/navigation';
import { getStaff, type Staff } from '@/server/auth/permissions';
import { getStreamers } from '@/server/services/content';
import type { Streamer } from '@/server/db/schema';

export type AdminContext = {
  staff: Staff;
  streamers: Streamer[];
  names: Map<string, string>;
  /** Channels this staff member may pick in forms. */
  channelOptions: { value: string; label: string }[];
};

export async function adminContext(): Promise<AdminContext> {
  const staff = await getStaff();
  if (!staff) redirect('/login?returnTo=/admin');
  // Hidden channels included: hiding is reversible, and their content stays editable.
  const streamers = await getStreamers({ includeHidden: true });
  const allowed = staff.isMaster ? streamers : streamers.filter((s) => s.id === staff.ownChannel);
  return {
    staff,
    streamers,
    names: new Map(streamers.map((s) => [s.id, s.displayName])),
    channelOptions: allowed.map((s) => ({ value: s.id, label: s.isActive ? s.displayName : `${s.displayName} (hidden)` })),
  };
}

export async function masterContext(): Promise<AdminContext> {
  const ctx = await adminContext();
  if (!ctx.staff.isMaster) redirect('/admin');
  return ctx;
}

/** Channel filter from `?channel=` — creators are always locked to their own. */
export function resolveChannel(ctx: AdminContext, requested: unknown): string | undefined {
  if (!ctx.staff.isMaster) return ctx.staff.ownChannel ?? '__none__';
  return typeof requested === 'string' && ctx.names.has(requested) ? requested : undefined;
}

export const param = (value: unknown) => (typeof value === 'string' && value ? value : undefined);

export const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
