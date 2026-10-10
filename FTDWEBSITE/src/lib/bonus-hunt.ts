/** Bonus hunt vocabulary, shared by the server pages and the client board. */

export const BONUS_KINDS = ['normal', 'super', 'hidden'] as const;

export type BonusKind = (typeof BONUS_KINDS)[number];

const LABELS: Record<string, string> = {
  normal: 'Normal',
  super: 'Super',
  hidden: 'Hidden',
};

export const bonusKindLabel = (kind: string) => LABELS[kind] ?? 'Normal';

/** Options for the admin forms, in the order they are offered. */
export const BONUS_KIND_OPTIONS = BONUS_KINDS.map((value) => ({ value, label: bonusKindLabel(value) }));
