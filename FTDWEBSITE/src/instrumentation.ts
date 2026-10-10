/**
 * Runs once when the server boots.
 *
 * Two jobs live here: resuming the Kick chat watcher if a member was mid-code
 * or a hunt was reading chat (slot calls, guesses) when the server restarted,
 * and keeping the Stake.com and Stake.eu wager leaderboards in step with Stake.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  try {
    const { ensureDatabaseReady } = await import('@/server/db/bootstrap');
    await ensureDatabaseReady();
  } catch (error) {
    // Let the server start anyway: the pages will surface the real problem.
    console.error('[instrumentation] could not prepare the database', error);
  }

  try {
    const { hasPendingVerifications } = await import('@/server/kick/chat-verification');
    const { hasHuntReadingChat } = await import('@/server/kick/hunt-chat');
    if ((await hasPendingVerifications()) || (await hasHuntReadingChat())) {
      const { ensureChatWatcher } = await import('@/server/kick/chat-watcher');
      await ensureChatWatcher();
    }
  } catch (error) {
    console.error('[instrumentation] could not resume Kick chat watcher', error);
  }

  await startLeaderboardSync();
}

/**
 * Pull the standings now, then every `LEADERBOARD_SYNC_INTERVAL_MS` (5 minutes
 * by default). This needs a server that stays up; on serverless hosting, hit
 * `/api/leaderboard/sync` from an external scheduler instead.
 */
async function startLeaderboardSync() {
  try {
    const { env, features } = await import('@/lib/env');
    if (!features.leaderboardSync) return;

    const { syncLeaderboards } = await import('@/server/services/leaderboard-sync');

    const run = async () => {
      const results = await syncLeaderboards();
      for (const [site, result] of Object.entries(results)) {
        if (result.ok) console.log(`[leaderboard] ${site}: synced ${result.entries} entries from ${result.source}`);
        if (result.apiError) console.warn(`[leaderboard] ${site}: API failed, used the sheet — ${result.apiError}`);
        else console.warn(`[leaderboard] ${site}: sync skipped — ${result.skipped ?? result.error}`);
      }
    };

    await run();
    // Never hold the process open just for the next pull.
    setInterval(run, Math.max(30_000, env.leaderboardSyncIntervalMs)).unref?.();
  } catch (error) {
    console.error('[instrumentation] could not start the leaderboard sync', error);
  }
}
