/** Header navigation — kept deliberately short. */
export const PRIMARY_NAV = [
  { href: '/streamers', label: 'Streamers' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/rewards', label: 'VIP Rewards' },
  { href: '/giveaways', label: 'Giveaways' },
  { href: '/challenges', label: 'Challenges' },
  { href: '/raffles', label: 'Raffles' },
] as const;

/** Content sections reached from the homepage, footer and mobile drawer. */
export const CONTENT_NAV = [
  { href: '/live', label: 'Live' },
  { href: '/bonus-hunt', label: 'Bonus hunt' },
  { href: '/clips', label: 'Clips' },
  { href: '/wall-of-fame', label: 'Wall of Fame' },
] as const;

export const SECONDARY_NAV = [{ href: '/community', label: 'Community' }] as const;

export const LEGAL_NAV = [
  { href: '/legal/responsible-gambling', label: 'Responsible gambling' },
  { href: '/legal/terms', label: 'Terms of use' },
  { href: '/legal/privacy', label: 'Privacy policy' },
  { href: '/legal/raffle-rules', label: 'Raffle & giveaway rules' },
  { href: '/legal/affiliate-disclosure', label: 'Affiliate disclosure' },
] as const;

/** Minimal, serialisable view of the signed-in member for client chrome. */
export type SessionView = {
  name: string;
  handle: string;
  avatarUrl: string;
  role: string;
} | null;
