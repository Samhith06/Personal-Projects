const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export const formatUsd = (value: number) => usd.format(value);

/** Bet sizes keep their cents below $100, so a $0.20 spin doesn't read as "$0". */
export const formatBet = (value: number) =>
  value < 100 ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }) : usd.format(value);

export function formatMinutes(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

/** "9d 12h 40m" until `to`, or null once it has passed. */
export function formatCountdown(to: Date, now = new Date()) {
  const ms = to.getTime() - now.getTime();
  if (ms <= 0) return null;
  const mins = Math.floor(ms / 60_000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  return d ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
}

/** "6 min ago" style relative time for sync timestamps. */
export function formatAgo(at: Date, now = new Date()) {
  const mins = Math.round((now.getTime() - at.getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return h < 48 ? `${h}h ago` : `${Math.round(h / 24)} days ago`;
}

export const ordinal = (n: number) => {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${s}`;
};

/**
 * `Mattyspins` → `Matt****`: first four letters, then a fixed `****` (so the
 * length isn't revealed either). Names of four letters or fewer keep only two.
 */
export function maskName(name: string) {
  return `${name.slice(0, name.length > 4 ? 4 : 2)}****`;
}

/** What a board's numbers are: Roobet's weighted wager, or the raw total. */
export const metricLabel = (metric: string) => (metric === 'weighted' ? 'weighted wager' : 'wagered');

/* Bonus hunt and slot tournament figures (same output as MattySpins' lib/format). */

/** "$1,234" or "$1,234.50": cents only when there are some. */
export function money(amount: number): string {
  const hasCents = Math.abs(amount % 1) > 0.0001;
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  });
}

/** A multiplier to two places at most: "12.35×", "130×". */
export function mult(m: number): string {
  if (m === 0) return '0×';
  return `${m.toFixed(2).replace(/\.?0+$/, '')}×`;
}

const UTC = { timeZone: 'UTC' } as const;

/** "26 Oct 2026". */
export function dateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { ...UTC, day: 'numeric', month: 'short', year: 'numeric' });
}

/** "26 Oct, 14:05 UTC". */
export function dateTime(iso: string): string {
  return `${new Date(iso).toLocaleString('en-GB', { ...UTC, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })} UTC`;
}
