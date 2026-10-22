const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export const formatUsd = (value: number) => usd.format(value);

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
