/**
 * Wager leaderboard sync — one board per Stake site.
 *
 * Stake.com and Stake.eu each run their own race with their own prizes. Each is
 * pulled from that site's affiliate API (`STAKE_COM_API_KEY`,
 * `STAKE_EU_API_KEY`) on an interval (see `src/instrumentation.ts`) and
 * mirrored into `leaderboard_boards` / `leaderboard_entries` under the site's
 * id, so every page reads the database as it always has. Until Stake.com has an
 * API key, its board keeps coming from the affiliate's published Google Sheet.
 *
 * Nothing here trusts a source's own rank: ranks are recomputed from `wagered`
 * so the number shown next to a row can never disagree with its position.
 */
import 'server-only';
import { and, asc, eq, inArray, isNotNull, sum } from 'drizzle-orm';
import { env } from '@/lib/env';
import { crewDay } from '@/lib/format';
import { db } from '@/server/db';
import { leaderboardBoards, leaderboardEntries, memberProgress, stakeWagerDays, users } from '@/server/db/schema';
import { LEADERBOARD_SITES, LEADERBOARD_SITE_LABEL, type LeaderboardSite } from '@/server/services/content';

/** The ladder a brand-new board starts on: $1,500 over the top ten. Admins change it per board. */
export const DEFAULT_PRIZE_LADDER = [600, 250, 170, 120, 90, 75, 65, 55, 45, 30];

/** `"600, 250,170"` -> [600, 250, 170]. Anything that is not a whole positive number is dropped. */
export function parsePrizeLadder(value: string | null | undefined) {
  return (value ?? '')
    .split(/[,\s]+/)
    .map((part) => Math.round(Number(part.replace(/\$/g, ''))))
    .filter((prize) => Number.isFinite(prize) && prize > 0);
}

export const ladderTotal = (ladder: number[]) => ladder.reduce((total, prize) => total + prize, 0);

export type SyncResult = {
  ok: boolean;
  source?: 'api' | 'sheet';
  entries: number;
  totalWagered: number;
  syncedAt: Date;
  skipped?: string;
  error?: string;
  /** Why the API pull failed when the sheet stood in for it. */
  apiError?: string;
};

export type SyncResults = Record<LeaderboardSite, SyncResult>;

/**
 * Kept on `globalThis` rather than in module scope: the boot hook that runs the
 * sync and the route that reports on it are separate module instances, so a
 * plain variable left the status route claiming no sync had ever run.
 */
const globalForSync = globalThis as unknown as { fgdrLastSync?: SyncResults };

/** The most recent sync outcome per board, for the admin panel and the sync route. */
export function getLastSyncResult() {
  return globalForSync.fgdrLastSync ?? null;
}

/* ------------------------------------------------------------------ parsing */

/** Minimal RFC 4180 reader — the wagered column arrives quoted (`"$1,857.47"`). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char !== '"') field += char;
      else if (text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') field += char;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((cell) => cell.trim()));
}

/**
 * The competition window: the whole calendar month, in UTC.
 *
 * The sheet's own `start_date_utc` / `end_date_utc` describe the export the
 * affiliate happened to run, not the competition, so they are deliberately
 * ignored — using them made a running board show as "Ended".
 */
function monthWindow(now: Date) {
  return {
    startsAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    endsAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  };
}

/** `"$1,857.47"` -> 1857.47 */
function parseMoney(value: string) {
  const amount = Number(value.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(amount) ? amount : 0;
}

/**
 * `thornle0x` -> `thor****`. The opening characters stay readable so a member
 * can spot their own row, and the tail is always hidden — a full affiliate
 * username is never stored on a public row.
 */
export function maskHandle(name: string) {
  const handle = name.trim();
  return `${handle.slice(0, 4)}****`;
}

/* ------------------------------------------------------------ daily history */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Turn running totals into per-day wagers (`stake_wager_days`).
 *
 * For each player, today's row is set to their running total minus everything
 * already recorded on earlier days of the same window. A sheet window is keyed
 * by the sheet's own start; an API window by `<site>:<race start>`, so the two
 * Stake sites never share a running total. Set, never added
 * to, so re-running a sync — every five minutes, every boot — changes nothing.
 *
 * The first time a whole window is seen, what was wagered before tracking began
 * is put on the window's first day rather than today, so it lands in the right
 * month. A player who appears in a window we already track is new today.
 */
async function recordWagerDays(tx: Tx, rows: WagerRow[], syncedAt: Date) {
  const today = crewDay(syncedAt);
  const windows = [...new Set(rows.map((row) => row.windowKey))];
  const history = await tx.select().from(stakeWagerDays).where(inArray(stakeWagerDays.windowStart, windows));

  const knownWindows = new Set(history.map((h) => h.windowStart));
  const earlier = new Map<string, number>(); // username|window -> recorded before today
  const seen = new Set<string>();
  for (const h of history) {
    const key = `${h.username}|${h.windowStart}`;
    seen.add(key);
    if (h.day !== today) earlier.set(key, (earlier.get(key) ?? 0) + h.wagered);
  }

  for (const row of rows) {
    const key = `${row.username}|${row.windowKey}`;
    let day = today;
    if (!seen.has(key) && !knownWindows.has(row.windowKey)) {
      const start = row.windowStartsAt;
      if (start && crewDay(start) < today) day = crewDay(start);
    }
    const wagered = Math.round((row.wagered - (earlier.get(key) ?? 0)) * 100) / 100;

    await tx
      .insert(stakeWagerDays)
      .values({ id: `${key}|${day}`, username: row.username, windowStart: row.windowKey, day, wagered, updatedAt: syncedAt })
      .onConflictDoUpdate({
        target: [stakeWagerDays.username, stakeWagerDays.windowStart, stakeWagerDays.day],
        set: { wagered, updatedAt: syncedAt },
      });
  }
}

/* --------------------------------------------------------------------- sync */

/**
 * One player's running total for a race window. `windowKey` identifies which
 * running total it is (see `recordWagerDays`), `windowStartsAt` when it began.
 */
type WagerRow = { username: string; wagered: number; windowKey: string; windowStartsAt: Date | null };

/** `15-Sep-26 12:00 AM` (UTC) -> Date, or null if the affiliate changes the format. */
function parseSheetDate(value: string) {
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{2}) (\d{1,2}):(\d{2}) (AM|PM)$/.exec(value.trim());
  if (!m) return null;
  const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(m[2].toLowerCase());
  if (month < 0) return null;
  const hour = (Number(m[4]) % 12) + (m[6] === 'PM' ? 12 : 0);
  return new Date(Date.UTC(2000 + Number(m[3]), month, Number(m[1]), hour, Number(m[5])));
}

function readSheet(csv: string): WagerRow[] {
  const [header, ...body] = parseCsv(csv);
  if (!header) return [];

  const column = (name: string) => header.findIndex((cell) => cell.trim().toLowerCase() === name);
  const at = {
    user: column('user_name'),
    wagered: column('wagered'),
    code: column('campaign_code'),
    start: column('start_date_utc'),
  };
  if (at.user < 0 || at.wagered < 0) return [];

  const wanted = env.leaderboardCampaignCode?.toLowerCase();

  return body
    .filter((cells) => !wanted || at.code < 0 || cells[at.code]?.trim().toLowerCase() === wanted)
    .map((cells) => {
      // The sheet's start, verbatim — the key its history has always used.
      const windowKey = (at.start >= 0 ? cells[at.start]?.trim() : '') || '';
      return {
        username: cells[at.user]?.trim() ?? '',
        wagered: parseMoney(cells[at.wagered] ?? ''),
        windowKey,
        windowStartsAt: parseSheetDate(windowKey),
      };
    })
    .filter((row) => row.username);
}

/* ---------------------------------------------------------------- Stake API */

/**
 * Where each board's standings come from: its site's affiliate API and, for
 * Stake.com, the affiliate sheet — used when there is no API key, and as the
 * fallback whenever the API pull fails, so the board never stops updating.
 */
function sourceFor(site: LeaderboardSite) {
  const api =
    site === 'stake-com'
      ? { url: env.stakeComApiUrl, key: env.stakeComApiKey }
      : { url: env.stakeEuApiUrl, key: env.stakeEuApiKey };
  const sheet = site === 'stake-com' ? env.leaderboardSheetUrl : undefined;
  if (!api.key && !sheet) return null;
  return { api: api.key ? { url: api.url, key: api.key } : null, sheet };
}

/** Rows from the API, else the sheet. An API failure is kept as a note when the sheet stands in. */
async function fetchRows(site: LeaderboardSite, source: NonNullable<ReturnType<typeof sourceFor>>, window: { startsAt: Date; endsAt: Date }) {
  if (source.api) {
    try {
      return { kind: 'api' as const, rows: await fetchApiRows(site, source.api.url, source.api.key, window) };
    } catch (error) {
      if (!source.sheet) throw error;
      const apiError = error instanceof Error ? error.message : String(error);
      return { kind: 'sheet' as const, rows: await fetchSheetRows(source.sheet), apiError };
    }
  }
  return { kind: 'sheet' as const, rows: await fetchSheetRows(source.sheet!) };
}

const pick = (record: Record<string, unknown>, names: string[]) => {
  for (const name of names) {
    const value = name.split('.').reduce<unknown>((at, part) => (at as Record<string, unknown> | undefined)?.[part], record);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
};

/** The first array of objects in the response — the referral list, wherever Stake nests it. */
function findRecords(value: unknown, depth = 0): Record<string, unknown>[] | null {
  if (Array.isArray(value)) {
    return value.length === 0 || value.every((item) => item && typeof item === 'object' && !Array.isArray(item))
      ? (value as Record<string, unknown>[])
      : null;
  }
  if (!value || typeof value !== 'object' || depth > 4) return null;
  for (const child of Object.values(value)) {
    const found = findRecords(child, depth + 1);
    if (found) return found;
  }
  return null;
}

/**
 * Read the API's referral list into rows.
 *
 * Stake does not publish the affiliate API's response shape, so the field names
 * are matched loosely — the same `user_name` / `wagered` / `campaign_code` the
 * affiliate sheet export uses, plus the camelCase spellings.
 */
function readApi(body: unknown, windowKey: string, windowStartsAt: Date): WagerRow[] | null {
  const records = findRecords(body);
  if (!records) return null;
  const wanted = env.leaderboardCampaignCode?.toLowerCase();

  return records
    .filter((record) => {
      const code = pick(record, ['campaign_code', 'campaignCode', 'campaign.code', 'code']);
      return !wanted || code === undefined || String(code).trim().toLowerCase() === wanted;
    })
    .map((record) => {
      const wagered = pick(record, ['wagered', 'wager', 'total_wagered', 'totalWagered', 'wagered_amount', 'wageredAmount', 'amount', 'volume']);
      return {
        username: String(pick(record, ['user_name', 'username', 'userName', 'name', 'user.name', 'user.username', 'nickname']) ?? '').trim(),
        wagered: typeof wagered === 'number' ? wagered : parseMoney(String(wagered ?? '')),
        windowKey,
        windowStartsAt,
      };
    })
    .filter((row) => row.username);
}

/** A short, single-line excerpt of a response for the sync status — enough to see what Stake said. */
const excerpt = (text: string) => text.replace(/\s+/g, ' ').trim().slice(0, 200);

async function fetchApiRows(site: LeaderboardSite, url: string, key: string, window: { startsAt: Date; endsAt: Date }) {
  const endpoint = new URL(url);
  const from = window.startsAt.toISOString();
  const to = window.endsAt.toISOString();
  // The parameter names are not documented either; both common spellings are sent.
  endpoint.searchParams.set('from', from);
  endpoint.searchParams.set('to', to);
  endpoint.searchParams.set('startDate', from);
  endpoint.searchParams.set('endDate', to);

  const response = await fetch(endpoint, {
    cache: 'no-store',
    headers: { accept: 'application/json', authorization: `Bearer ${key}`, 'x-api-key': key },
    signal: AbortSignal.timeout(20_000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${LEADERBOARD_SITE_LABEL[site]} API responded ${response.status}: ${excerpt(text)}`);

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`${LEADERBOARD_SITE_LABEL[site]} API did not return JSON: ${excerpt(text)}`);
  }
  const rows = readApi(body, `${site}:${from}`, window.startsAt);
  if (!rows) throw new Error(`${LEADERBOARD_SITE_LABEL[site]} API response had no player list: ${excerpt(text)}`);
  return rows;
}

async function fetchSheetRows(url: string) {
  const response = await fetch(url, { cache: 'no-store', redirect: 'follow', signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`sheet responded ${response.status}`);
  return readSheet(await response.text());
}

/* --------------------------------------------------------------------- sync */

/**
 * Pull one site and replace its board's standings.
 *
 * Rows are matched back to members by their self-declared Stake username, so a
 * signed-in member keeps seeing "your rank" without anyone linking rows by hand.
 */
async function syncBoard(site: LeaderboardSite, memberBy: Map<string, string>): Promise<SyncResult> {
  // `memberBy` holds this site's usernames only: Stake.com and Stake.eu are separate accounts.
  const syncedAt = new Date();
  const source = sourceFor(site);
  if (!source) {
    const needs = site === 'stake-com' ? 'STAKE_COM_API_KEY (or LEADERBOARD_SHEET_URL)' : 'STAKE_EU_API_KEY';
    return { ok: false, entries: 0, totalWagered: 0, syncedAt, skipped: `${needs} is not set` };
  }

  let kind: 'api' | 'sheet' = source.api ? 'api' : 'sheet';
  let apiError: string | undefined;
  try {
    const [board] = await db.select().from(leaderboardBoards).where(eq(leaderboardBoards.period, site)).limit(1);

    // A start/end an admin typed in is theirs; only a board without one
    // follows the calendar month. Overwriting it on every sync is what made
    // custom times impossible to set.
    const custom = board?.customWindow && board.startsAt && board.endsAt;
    const window = custom ? { startsAt: board.startsAt!, endsAt: board.endsAt! } : monthWindow(syncedAt);

    const pulled = await fetchRows(site, source, window);
    kind = pulled.kind;
    apiError = 'apiError' in pulled ? pulled.apiError : undefined;
    const rows = pulled.rows
      .filter((row) => row.wagered > 0)
      .sort((a, b) => b.wagered - a.wagered);

    if (rows.length === 0) {
      return { ok: false, source: kind, entries: 0, totalWagered: 0, syncedAt, skipped: `${kind} returned no usable rows`, apiError };
    }

    // Previous ranks, so a row can show whether it climbed or dropped.
    const previous = await db
      .select()
      .from(leaderboardEntries)
      .where(eq(leaderboardEntries.period, site))
      .orderBy(asc(leaderboardEntries.rank));
    const wasRanked = new Map(previous.map((entry) => [entry.username, entry.rank]));

    const ladder = board ? parsePrizeLadder(board.prizeLadder) : DEFAULT_PRIZE_LADDER;
    const totalWagered = Math.round(rows.reduce((total, row) => total + row.wagered, 0));

    const entries = rows.map((row, index) => {
      const rank = index + 1;
      const username = maskHandle(row.username);
      const before = wasRanked.get(username);
      return {
        id: `${site}-${rank}`,
        period: site,
        rank,
        username,
        avatarUrl: null,
        wagered: Math.round(row.wagered),
        prize: ladder[index] ?? null,
        movement: before == null ? null : before - rank,
        userId: memberBy.get(row.username.toLowerCase()) ?? null,
      };
    });

    await db.transaction(async (tx) => {
      await tx.delete(leaderboardEntries).where(eq(leaderboardEntries.period, site));
      await tx.insert(leaderboardEntries).values(entries);
      await recordWagerDays(tx, rows, syncedAt);

      await tx
        .insert(leaderboardBoards)
        .values({
          period: site,
          label: LEADERBOARD_SITE_LABEL[site],
          subtitle: `$${ladderTotal(ladder).toLocaleString('en-US')} ${LEADERBOARD_SITE_LABEL[site]} wager leaderboard — code FGDR`,
          ...window,
          prizePool: ladderTotal(ladder),
          prizeLadder: ladder.join(','),
          totalWagered,
          updatedAt: syncedAt,
        })
        .onConflictDoUpdate({
          target: leaderboardBoards.period,
          // The label, subtitle and prizes stay editable in the admin panel;
          // the default ladder is only the starting point for a brand-new board.
          set: { ...(custom ? {} : window), totalWagered, updatedAt: syncedAt },
        });
    });

    return { ok: true, source: kind, entries: entries.length, totalWagered, syncedAt, apiError };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // The previous standings stay in place — a failed pull never blanks the board.
    return { ok: false, source: kind, entries: 0, totalWagered: 0, syncedAt, error: message, apiError };
  }
}

/**
 * What each member has wagered this race, for the VIP ladder: the sum of their
 * rows across both boards.
 *
 * Taken from the stored standings, so a member's tier and their leaderboard
 * positions can never tell different stories, and a site whose pull failed
 * still counts with its last good standings. Everyone drops to zero first, then
 * the current figures go back on — that is what makes the month roll over by
 * itself. Set, never added to: this runs every few minutes and on every boot.
 */
async function recomputeMemberProgress() {
  const totals = await db
    .select({ userId: leaderboardEntries.userId, wagered: sum(leaderboardEntries.wagered).mapWith(Number) })
    .from(leaderboardEntries)
    .where(and(inArray(leaderboardEntries.period, LEADERBOARD_SITES), isNotNull(leaderboardEntries.userId)))
    .groupBy(leaderboardEntries.userId);
  const updatedAt = new Date();

  await db.transaction(async (tx) => {
    await tx.update(memberProgress).set({ monthWagered: 0, updatedAt });
    for (const t of totals) {
      const monthWagered = Math.round(t.wagered ?? 0);
      await tx
        .insert(memberProgress)
        .values({ userId: t.userId!, monthWagered, updatedAt })
        // `totalWagered` is left alone: the boards report a race, not a lifetime.
        .onConflictDoUpdate({ target: memberProgress.userId, set: { monthWagered, updatedAt } });
    }
  });
}

/** Pull every Stake site into its own board, then refresh the VIP ladder from both. */
export async function syncLeaderboards(): Promise<SyncResults> {
  // Members who told us their Stake.com / Stake.eu usernames get their rows
  // on that site's board linked to them.
  const members = await db
    .select({ id: users.id, com: users.stakeUsername, eu: users.stakeEuUsername })
    .from(users);
  const byName = (pick: (m: (typeof members)[number]) => string | null) =>
    new Map(members.flatMap((m) => (pick(m)?.trim() ? [[pick(m)!.trim().toLowerCase(), m.id] as const] : [])));
  const memberBy: Record<LeaderboardSite, Map<string, string>> = {
    'stake-com': byName((m) => m.com),
    'stake-eu': byName((m) => m.eu),
  };

  // One after the other: SQLite takes a single writer, and two overlapping
  // transactions would fail each other.
  const results = {} as SyncResults;
  for (const site of LEADERBOARD_SITES) results[site] = await syncBoard(site, memberBy[site]);

  if (Object.values(results).some((result) => result.ok)) await recomputeMemberProgress();

  globalForSync.fgdrLastSync = results;
  return results;
}
