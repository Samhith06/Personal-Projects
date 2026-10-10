/** View models shared between server and client components. */

export type LiveState = {
  streamerId: string;
  isLive: boolean;
  title: string | null;
  viewers: number | null;
  category: string | null;
  thumbnailUrl: string | null;
  /** ISO timestamp — serialisable across the server/client boundary. */
  startedAt: string | null;
  lastLiveAt: string | null;
  /** Channel imagery straight from Kick (null when unavailable). */
  avatarUrl?: string | null;
  offlineBannerUrl?: string | null;
  /** 'kick' when the data came from Kick, 'mock' only if Kick was unreachable. */
  source: 'kick' | 'mock';
};

export type LiveMap = Record<string, LiveState>;

export type ClipPlatform = 'kick' | 'youtube' | 'instagram' | 'x' | 'tiktok' | 'upload';

/** Everything the mini-player needs, for both clips and Wall of Fame entries. */
export type PlayableMedia = {
  id: string;
  kind: 'clip' | 'win';
  title: string;
  streamerId: string;
  streamerName: string;
  platform: ClipPlatform;
  url: string | null;
  mediaUrl: string | null;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  orientation: 'landscape' | 'portrait';
  durationSec: number | null;
  views: number | null;
  publishedAt: string;
  accent: string;
  /** Wall of Fame extras */
  payout?: number;
  bet?: number;
  game?: string;
  provider?: string;
  description?: string;
};

export type Accent = 'gold' | 'cyan' | 'steel' | 'ruby';

/** One bonus on the hunt board. `payout` is null until it has been opened. */
export type HuntBonusView = {
  id: string;
  position: number;
  game: string;
  provider: string;
  bet: number;
  payout: number | null;
  /** ISO timestamp — serialisable across the server/client boundary. */
  openedAt: string | null;
  /** normal | super | hidden */
  kind: string;
  /** Kick username of the viewer who called it from chat, if anyone did. */
  calledBy: string | null;
};

/**
 * A bonus hunt as the board renders it.
 *
 * Everything under `stats` is derived from `bonuses` on read, never stored, so
 * the two can't contradict each other. Multipliers are left as raw numbers for
 * the client to format.
 */
export type BonusHuntView = {
  id: string;
  streamerId: string;
  title: string;
  /** collecting | guessing | opening | complete */
  status: string;
  startBalance: number;
  startedAt: string;
  endedAt: string | null;
  source: string;
  bonuses: HuntBonusView[];
  /** Guess the balance: how many guesses are in, and — once the hunt is finished — who won. */
  gtb: {
    guesses: number;
    winner: GtbPlace | null;
  };
  stats: {
    total: number;
    opened: number;
    remaining: number;
    totalBet: number;
    remainingBet: number;
    won: number;
    profit: number;
    /** Average multiplier the whole hunt needs to break even. Null with no bonuses. */
    breakEvenX: number | null;
    /** Average multiplier achieved so far. Null until something is opened. */
    runningX: number | null;
    /** What the unopened ones still have to average. Null when none are left. */
    requiredX: number | null;
    bestId: string | null;
  };
};

/** A guess-the-balance guess ranked against the final balance. */
export type GtbPlace = {
  username: string;
  guess: number;
  /** How far off the final balance, in USD. */
  off: number;
};

/** A game already recorded on the site, offered as an autocomplete suggestion. */
export type GameSuggestion = {
  game: string;
  provider: string;
  /** How many times it has been logged — drives the ordering. */
  uses: number;
};
