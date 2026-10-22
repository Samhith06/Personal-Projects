/**
 * Chat-based watch time (ARCHITECTURE.md §3.2), as pure functions so the rules
 * can be tested and re-run over stored history.
 *
 *   - Only messages sent while Steezy is live count.
 *   - Each counted message credits the time since the member's previous counted
 *     message, if that was at most GAP_MINUTES ago; otherwise (first message of
 *     a run) it credits a flat FLAT_MINUTES.
 *   - Anti-farm: messages shorter than MIN_CHARS, a repeat of the member's last
 *     message, or sent within MIN_SPACING_SECONDS of their last counted message
 *     are stored but earn nothing.
 *
 * Kick doesn't expose a viewer list, so people who watch without chatting get
 * no watch time. That's a known limitation, not a bug.
 */

export const WATCH_RULES = {
  GAP_MINUTES: 10,
  FLAT_MINUTES: 5,
  MIN_CHARS: 2,
  MIN_SPACING_SECONDS: 5,
} as const;

export type Rules = typeof WATCH_RULES;

/** Lower-case, collapse whitespace — so "LUL", "lul " and "lul" count as the same message. */
export function normaliseMessage(content: string) {
  return content.trim().toLowerCase().replace(/\s+/g, ' ');
}

export type PreviousMessage = { at: Date; contentHash: string; counted: boolean } | null;

/** Does this message earn credit, given the member's previous message in the same session? */
export function isCounted(
  content: string,
  contentHash: string,
  at: Date,
  previous: PreviousMessage,
  lastCountedAt: Date | null,
  rules: Rules = WATCH_RULES,
) {
  if (normaliseMessage(content).length < rules.MIN_CHARS) return false;
  if (previous && previous.contentHash === contentHash) return false;
  if (lastCountedAt && at.getTime() - lastCountedAt.getTime() < rules.MIN_SPACING_SECONDS * 1000) return false;
  return true;
}

/** Total watch seconds for one member in one session, from their counted message times (any order). */
export function watchSeconds(countedTimes: Date[], rules: Rules = WATCH_RULES) {
  const times = countedTimes.map((d) => d.getTime()).sort((a, b) => a - b);
  const gap = rules.GAP_MINUTES * 60_000;
  const flat = rules.FLAT_MINUTES * 60;
  let total = 0;
  for (let i = 0; i < times.length; i++) {
    const since = i === 0 ? Infinity : times[i] - times[i - 1];
    total += since <= gap ? since / 1000 : flat;
  }
  return Math.round(total);
}
