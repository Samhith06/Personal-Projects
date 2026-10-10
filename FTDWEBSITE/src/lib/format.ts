/** Shared formatting helpers. Safe on both server and client. */

const usdFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const usdCentsFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const numFmt = new Intl.NumberFormat('en-US');
const compactFmt = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

/**
 * Money.
 *
 * Whole amounts read cleanly as `$1,200`, but plenty of real numbers here are
 * fractions of a dollar — a $0.20 spin, a $0.10 tip — so anything with cents
 * keeps them rather than being rounded away to `$0`.
 */
export const usd = (n: number) => (Number.isInteger(n) ? usdFmt.format(n) : usdCentsFmt.format(n));
export const num = (n: number) => numFmt.format(n);
export const compact = (n: number) => compactFmt.format(n);

export const formatValue = (n: number, format: string) => (format === 'currency' ? usd(n) : num(n));

/** Multiplier, always derived from payout / bet so the two can never disagree. */
export function multiplier(payout: number, bet: number) {
  const m = bet ? payout / bet : 0;
  return `x${m >= 100 ? numFmt.format(Math.round(m)) : m.toFixed(2).replace(/\.?0+$/, '')}`;
}

export const percent = (current: number, target: number) =>
  Math.max(0, Math.min(100, target ? (current / target) * 100 : 0));

export function duration(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

export function clock(seconds?: number | null) {
  if (seconds == null) return '';
  return `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;
}

export function relativeTime(date: Date | string | number) {
  const t = new Date(date).getTime();
  const diff = Date.now() - t;
  const past = diff >= 0;
  const minutes = Math.round(Math.abs(diff) / 60_000);
  if (minutes < 1) return 'just now';
  let out: string;
  if (minutes < 60) out = `${minutes}m`;
  else if (minutes < 60 * 24) out = `${Math.round(minutes / 60)}h`;
  else out = `${Math.round(minutes / 1440)}d`;
  return past ? `${out} ago` : `in ${out}`;
}

export const ordinal = (n: number) => ({ 1: 'st', 2: 'nd', 3: 'rd' }[n] ?? 'th');

/** Stable date/time helpers — always rendered with an explicit locale + zone
 *  on the server, and re-rendered in the visitor's zone on the client. */
export function dateLabel(date: Date | string | number, timeZone?: string) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone });
}

export function timeLabel(date: Date | string | number, timeZone?: string) {
  return new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone });
}

export function weekdayLabel(date: Date | string | number, timeZone?: string) {
  return new Date(date).toLocaleDateString('en-US', { weekday: 'long', timeZone });
}

/** The crew runs on German time — leaderboard start/end are set and shown in it. */
export const CREW_TIME_ZONE = 'Europe/Berlin';

/** `Oct 1, 18:00 CEST` in German time. */
export function crewDateTimeLabel(date: Date | string | number) {
  return new Date(date).toLocaleString('en-GB', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: CREW_TIME_ZONE,
    timeZoneName: 'short',
  });
}

/** `2026-09-30` — the calendar day an instant falls on in German time. */
export function crewDay(date: Date | string | number) {
  // en-CA formats as YYYY-MM-DD.
  return new Date(date).toLocaleDateString('en-CA', { timeZone: CREW_TIME_ZONE });
}

/** First day of the month and of the Monday-start week containing `date`, German time. */
export function crewPeriodStarts(date: Date | string | number) {
  const today = crewDay(date);
  const [y, m, d] = today.split('-').map(Number);
  const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // Monday = 0
  return {
    today,
    month: `${today.slice(0, 7)}-01`,
    week: new Date(Date.UTC(y, m - 1, d - weekday)).toISOString().slice(0, 10),
  };
}

export function relativeDay(date: Date | string | number) {
  const d = new Date(date);
  const today = new Date();
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const b = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((a.getTime() - b.getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return weekdayLabel(d);
}

/** Placeholder-aware external link props. '#' means "not supplied yet". */
export const isPlaceholderUrl = (url?: string | null) => !url || url === '#';
