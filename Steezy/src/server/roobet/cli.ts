/**
 * Backfill Roobet daily wagers.
 *
 *   npm run roobet:sync                 # yesterday + today
 *   npm run roobet:sync -- 2026-01-01   # every day since that date
 */
import 'dotenv/config';
import { syncWagerBoosts } from '@/server/services/wager-boosts';
import { roobetConfigFromEnv, syncRoobetRange, syncRoobetRecent } from './sync';

async function main() {
  const config = roobetConfigFromEnv();
  if (!config) throw new Error('Set ROOBET_USER_ID and ROOBET_API_KEY in .env');

  const from = process.argv[2];
  if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) throw new Error('Pass the start date as YYYY-MM-DD');

  const result = from ? await syncRoobetRange(config, new Date(`${from}T00:00:00Z`)) : await syncRoobetRecent(config);
  console.log(result);
  if (result.ok) console.log('double points', await syncWagerBoosts(config));
  process.exit(result.ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
