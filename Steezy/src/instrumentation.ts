/**
 * Runs once when the server boots (pattern from FTDWEBSITE).
 *
 * Keeps Roobet wagers in step — pull now, then every ROOBET_SYNC_INTERVAL_MS —
 * freezes live leaderboards whose window has ended, closes ended draws, and
 * mirrors bonushunt.gg hunts every BONUSHUNT_SYNC_INTERVAL_MS.
 * This needs a server that stays up; on serverless hosting, run
 * `npm run roobet:sync` from a scheduler instead. The Kick chat worker, badge
 * and watch-time jobs will be started from here as they're built.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  try {
    const { roobetConfigFromEnv, syncRoobetRecent } = await import('@/server/roobet/sync');
    const { freezeEndedLeaderboards } = await import('@/server/services/leaderboards');
    const { closeStaleSessions } = await import('@/server/kick/sessions');
    const { closeEndedRaffles } = await import('@/server/services/raffles');
    const { closeExpiredGiveaways } = await import('@/server/services/giveaways');
    const config = roobetConfigFromEnv();

    const run = async () => {
      if (config) {
        const result = await syncRoobetRecent(config);
        if (result.ok) console.log(`[roobet] synced ${result.rows} player-days over ${result.days} days`);
        else console.warn(`[roobet] sync failed — ${result.error}`);
      }
      // After the pull, so a board ending now freezes on the final numbers.
      const frozen = await freezeEndedLeaderboards().catch((error) => {
        console.error('[leaderboard] auto-freeze failed', error);
        return 0;
      });
      if (frozen) console.log(`[leaderboard] froze ${frozen} ended board(s)`);
      const closedRaffles = await closeEndedRaffles().catch(() => 0);
      const closedGiveaways = await closeExpiredGiveaways().catch(() => 0);
      if (closedRaffles || closedGiveaways) console.log(`[draws] closed ${closedRaffles} raffle(s), ${closedGiveaways} giveaway(s)`);
      const stale = await closeStaleSessions().catch(() => 0);
      if (stale) console.warn(`[stream] closed ${stale} session(s) left open by a missed offline event`);
    };

    await run();
    const interval = Math.max(60_000, Number(process.env.ROOBET_SYNC_INTERVAL_MS ?? 600_000));
    setInterval(run, interval).unref?.();
  } catch (error) {
    console.error('[instrumentation] could not start the Roobet sync', error);
  }

  await startHuntSync();
}

/** Mirror bonushunt.gg hunts every BONUSHUNT_SYNC_INTERVAL_MS (30 s) so the hunt overlay keeps up with the opening. */
async function startHuntSync() {
  try {
    const { bonushuntKey, syncHunts } = await import('@/server/bonushunt/sync');
    const key = bonushuntKey();
    if (!key) return;
    let lastError: string | null = null;
    const run = async () => {
      const result = await syncHunts(key);
      // Log failures once, not every 30 seconds.
      if (!result.ok && result.error !== lastError) console.warn(`[bonushunt] sync failed — ${result.error}`);
      if (result.ok && result.settled) console.log(`[bonushunt] settled ${result.settled} hunt(s)`);
      lastError = result.ok ? null : result.error;
    };
    await run();
    setInterval(run, Math.max(15_000, Number(process.env.BONUSHUNT_SYNC_INTERVAL_MS ?? 30_000))).unref?.();
  } catch (error) {
    console.error('[instrumentation] could not start the bonushunt.gg sync', error);
  }
}
