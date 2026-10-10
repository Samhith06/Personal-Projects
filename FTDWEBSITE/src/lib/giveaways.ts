/** Giveaway vocabulary, shared by the server pages and the client slider. */

export const GIVEAWAY_KINDS = ['tip', 'bonus-buy', 'raffle', 'challenge', 'other'] as const;

export type GiveawayKind = (typeof GIVEAWAY_KINDS)[number];

const LABELS: Record<string, string> = {
  tip: 'Tip',
  'bonus-buy': 'Bonus buy',
  raffle: 'Raffle',
  challenge: 'Challenge',
  other: 'Giveaway',
};

export const giveawayKindLabel = (kind: string) => LABELS[kind] ?? 'Giveaway';

/** Options for the admin form, in the order they are offered. */
export const GIVEAWAY_KIND_OPTIONS = GIVEAWAY_KINDS.map((value) => ({
  value,
  label: value === 'raffle' ? 'Raffle payout' : value === 'challenge' ? 'Challenge prize' : giveawayKindLabel(value),
}));
