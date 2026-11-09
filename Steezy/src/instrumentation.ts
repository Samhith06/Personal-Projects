/**
 * Runs once when the server boots (pattern from FTDWEBSITE).
 *
 * Keeps Roobet wagers in step — pull now, then every ROOBET_SYNC_INTERVAL_MS —
 * posts leaderboard climbs and daily standings to Discord, freezes live leaderboards whose window has ended, closes ended raffles,
 * auto-draws giveaways whose timer ran out, and refreshes the slot catalog from bonushunt.gg's new-slots feed every six hours.
 * This needs a server that stays up; on serverless hosting, run
 * `npm run roobet:sync` from a scheduler instead. The Kick chat worker, badge
 * and watch-time jobs will be started from here as they're built.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  try {
    const { roobetConfigFromEnv, syncLiveBoardWindows, syncRoobetRecent } = await import('@/server/roobet/sync');
    const { freezeEndedLeaderboards } = await import('@/server/services/leaderboards');
    const { announceLeaderboardChanges, postDailyStandings } = await import('@/server/services/leaderboard-announce');
    const { closeStaleSessions } = await import('@/server/kick/sessions');
    const { autoApprovePendingRoobet } = await import('@/server/services/admin');
    const { closeEndedRaffles } = await import('@/server/services/raffles');
    const config = roobetConfigFromEnv();

    // The first run after boot fills in every day of the live board; later runs re-pull yesterday and today.
    let firstRun = true;
    const run = async () => {
      if (config) {
        const result = firstRun ? await syncLiveBoardWindows(config) : await syncRoobetRecent(config);
        firstRun = false;
        if (result.ok) console.log(`[roobet] synced ${result.rows} player-days over ${result.days} days`);
        else console.warn(`[roobet] sync failed — ${result.error}`);
        if (result.ok) {
          const climbs = await announceLeaderboardChanges().catch((error) => {
            console.warn('[leaderboard] Discord update failed', error);
            return 0;
          });
          if (climbs) console.log(`[leaderboard] posted ${climbs} climb(s) to Discord`);
          const daily = await postDailyStandings().catch((error) => {
            console.warn('[leaderboard] daily Discord standings failed', error);
            return false;
          });
          if (daily) console.log('[leaderboard] posted daily standings to Discord');
          const autoApproved = await autoApprovePendingRoobet().catch((error) => {
            console.warn('[roobet] auto-approve failed', error);
            return 0;
          });
          if (autoApproved) console.log(`[roobet] auto-approved ${autoApproved} username(s)`);
        }
      }
      // After the pull, so a board ending now freezes on the final numbers.
      const frozen = await freezeEndedLeaderboards().catch((error) => {
        console.error('[leaderboard] auto-freeze failed', error);
        return 0;
      });
      if (frozen) console.log(`[leaderboard] froze ${frozen} ended board(s)`);
      const closedRaffles = await closeEndedRaffles().catch(() => 0);
      if (closedRaffles) console.log(`[draws] closed ${closedRaffles} raffle(s)`);
      const stale = await closeStaleSessions().catch(() => 0);
      if (stale) console.warn(`[stream] closed ${stale} session(s) left open by a missed offline event`);
    };

    await run();
    const interval = Math.max(60_000, Number(process.env.ROOBET_SYNC_INTERVAL_MS ?? 600_000));
    setInterval(run, interval).unref?.();
  } catch (error) {
    console.error('[instrumentation] could not start the Roobet sync', error);
  }

  startGiveawayAutoDraw();
  startSlotCatalogSync();
}

/**
 * Draws giveaways the moment their timer runs out. On its own short loop
 * because the stream is watching the countdown; the next run is only queued
 * once this one finishes, so a slow database can't stack up draws.
 */
function startGiveawayAutoDraw() {
  const SWEEP_MS = 3000;
  const run = async () => {
    try {
      const { drawExpiredGiveaways } = await import('@/server/services/giveaways');
      const drawn = await drawExpiredGiveaways();
      if (drawn) console.log(`[giveaways] auto-drew ${drawn} giveaway(s)`);
    } catch (error) {
      console.warn('[giveaways] auto-draw sweep failed', error);
    }
    setTimeout(run, SWEEP_MS).unref?.();
  };
  void run();
}

/**
 * The slot catalog the hunt and `!sr` match against. bonushunt.gg's feed only
 * covers the last week and refreshes hourly, so every six hours misses nothing
 * while keeping the load on their free API small. The first run waits a
 * minute so a deploy's boot isn't spent crawling ~20 pages.
 */
function startSlotCatalogSync() {
  const run = async () => {
    try {
      const { syncCatalog } = await import('@/server/services/slots');
      const result = await syncCatalog();
      if (result.ok) console.log(`[slots] read ${result.seen} slot(s) from bonushunt.gg; catalog holds ${result.total}`);
      else console.warn(`[slots] catalog sync failed — ${result.detail}`);
    } catch (error) {
      console.warn('[slots] catalog sync failed', error);
    }
  };
  setTimeout(run, 60_000).unref?.();
  setInterval(run, 6 * 60 * 60 * 1000).unref?.();
}
