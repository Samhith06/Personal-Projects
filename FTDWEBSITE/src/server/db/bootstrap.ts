import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from './schema';

/**
 * Bring the database up to date when the server boots.
 *
 * The database lives on a mounted volume that starts out empty, so the first
 * boot has to create the tables itself. Doing it here rather than in a
 * deploy-time hook keeps a release self-contained: whatever starts the server
 * gets a working database, with no separate migration step to remember.
 *
 * Both halves are safe to repeat. Migrations are tracked by Drizzle, and the
 * sample content is only loaded into a database that has none.
 */
let started: Promise<void> | null = null;

export function ensureDatabaseReady() {
  started ??= run();
  return started;
}

const MIGRATIONS_FOLDER = 'drizzle';

type JournalEntry = { idx: number; when: number; tag: string };

async function run() {
  const client = createClient({
    url: process.env.DATABASE_URL ?? 'file:./fgdr.db',
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

  try {
    await stampBaseline(client);
    await migrate(drizzle(client, { schema }), { migrationsFolder: MIGRATIONS_FOLDER });
    await purgePreviewAccounts(client);

    /*
     * Is this database already in use?
     *
     * `site_settings` is the sentinel rather than `streamers`, because a data
     * migration can put a row in `streamers` — the one that adds a channel to
     * the crew does exactly that. Counting streamers would then make a brand
     * new database look populated and skip the seed, leaving a site with one
     * creator and nothing else. Only the seed and an admin save ever write
     * `site_settings`.
     */
    const [{ n }] = (await client.execute('select count(*) as n from site_settings')).rows as unknown as [{ n: number }];
    if (Number(n) > 0) return;

    console.log('[db] empty database — loading the sample content');
    const { seedDatabase } = await import('./seed');
    await seedDatabase();
  } finally {
    client.close();
  }
}


/**
 * Delete the three accounts the old "Preview as …" sign-in used to create.
 *
 * That sign-in is gone, but the rows it left on the staging database are not,
 * and one of them holds the master-admin role. A session cookie issued before
 * launch is a signed reference to a user id, so it would keep working for its
 * full thirty days as long as the row is still there. Removing the rows is what
 * actually closes that door.
 *
 * Safe to repeat: after the first boot there is nothing left to match.
 */
async function purgePreviewAccounts(client: Client) {
  const discordIds = ['100000000000000001', '100000000000000002', '100000000000000003'];
  const marks = discordIds.map(() => '?').join(', ');

  const found = await client.execute({
    sql: `select id from users where discord_id in (${marks})`,
    args: discordIds,
  });
  if (found.rows.length === 0) return;

  const ids = found.rows.map((r) => String(r.id));
  const idMarks = ids.map(() => '?').join(', ');

  // No foreign keys are declared, so anything pointing at these ids has to be
  // cleared by hand or it is left dangling.
  await client.execute({ sql: `update leaderboard_entries set user_id = null where user_id in (${idMarks})`, args: ids });
  for (const table of ['member_progress', 'raffle_entries', 'challenge_entries', 'kick_verifications']) {
    await client.execute({ sql: `delete from ${table} where user_id in (${idMarks})`, args: ids });
  }
  await client.execute({ sql: `delete from users where id in (${idMarks})`, args: ids });

  console.log(`[db] removed ${ids.length} leftover preview account(s)`);
}
/**
 * Reconcile a database whose tables were created outside the migration system.
 *
 * `drizzle-kit push` writes the schema straight to the database without
 * recording anything in the migration journal. A database set up that way then
 * looks brand new to the migrator, which tries to `CREATE TABLE` everything
 * again and fails on the first table that already exists — taking every later
 * migration down with it.
 *
 * So: if the schema is clearly already there but nothing is recorded, mark the
 * first migration as applied and let the rest run normally.
 */
async function stampBaseline(client: Client) {
  const tables = await client.execute(
    "select name from sqlite_master where type = 'table' and name in ('streamers', '__drizzle_migrations')",
  );
  const names = new Set(tables.rows.map((r) => String(r.name)));
  if (!names.has('streamers')) return; // Genuinely new — let the migrator build it.
  if (!names.has('__drizzle_migrations')) {
    await client.execute(
      'create table if not exists __drizzle_migrations (id integer primary key autoincrement, hash text not null, created_at numeric)',
    );
  }

  const applied = await client.execute('select count(*) as n from __drizzle_migrations');
  if (Number(applied.rows[0]?.n ?? 0) > 0) return; // Already tracked.

  const journalPath = path.join(process.cwd(), MIGRATIONS_FOLDER, 'meta', '_journal.json');
  const journal = JSON.parse(await readFile(journalPath, 'utf8')) as { entries: JournalEntry[] };
  const baseline = journal.entries.find((e) => e.idx === 0);
  if (!baseline) return;

  // Drizzle identifies an applied migration by the hash of its SQL file.
  const sql = await readFile(path.join(process.cwd(), MIGRATIONS_FOLDER, `${baseline.tag}.sql`), 'utf8');
  const hash = createHash('sha256').update(sql).digest('hex');

  await client.execute({
    sql: 'insert into __drizzle_migrations (hash, created_at) values (?, ?)',
    args: [hash, baseline.when],
  });
  console.log(`[db] existing schema adopted — marked ${baseline.tag} as already applied`);
}
