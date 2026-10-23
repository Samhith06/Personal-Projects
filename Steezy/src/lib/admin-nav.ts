/**
 * The staff sidebar, in four groups (same layout as the MattySpins staff area).
 *
 * Moderation first because it's the day-to-day work: approvals, payouts and the
 * reward programs. Stream games are the ones run live on stream. Data and
 * System are reference, reached occasionally.
 */
export type AdminSection = {
  href: string;
  label: string;
  group: 'work' | 'games' | 'data' | 'sys';
  /** Which queue count, if any, shows as a badge. */
  count?: 'approvals' | 'payouts' | 'flags';
};

export const ADMIN_SECTIONS: AdminSection[] = [
  { href: '/admin', label: 'Overview', group: 'work' },
  { href: '/admin/approvals', label: 'Roobet approvals', group: 'work', count: 'approvals' },
  { href: '/admin/payouts', label: 'Payouts', group: 'work', count: 'payouts' },
  { href: '/admin/leaderboards', label: 'Leaderboards', group: 'work' },
  { href: '/admin/milestones', label: 'Milestones', group: 'work' },
  { href: '/admin/raffles', label: 'Raffles', group: 'work' },
  { href: '/admin/giveaways', label: 'Giveaways', group: 'work' },
  { href: '/admin/hunts', label: 'Bonus hunts', group: 'games' },
  { href: '/admin/tournaments', label: 'Tournaments', group: 'games' },
  { href: '/admin/members', label: 'Members', group: 'data' },
  { href: '/admin/audit', label: 'Audit log', group: 'sys', count: 'flags' },
];

export const GROUP_LABELS: Record<AdminSection['group'], string> = {
  work: 'Moderation',
  games: 'Stream games',
  data: 'Data',
  sys: 'System',
};
