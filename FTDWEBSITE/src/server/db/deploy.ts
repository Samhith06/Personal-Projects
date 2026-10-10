/**
 * Release-time database step: `npm run db:deploy`.
 *
 * It runs the same `ensureDatabaseReady()` the server runs on boot rather than
 * calling `drizzle-kit migrate` directly, so both paths handle a database whose
 * tables were created outside the migration system — a plain `migrate` there
 * tries to create them a second time and takes the release down with it.
 *
 * Safe to run on every deploy: migrations are tracked, and the sample content
 * only loads into a database that has none.
 */
import 'dotenv/config';
import { ensureDatabaseReady } from './bootstrap';

ensureDatabaseReady()
  .then(() => {
    console.log('[db] ready');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[db] could not prepare the database', error);
    process.exit(1);
  });
