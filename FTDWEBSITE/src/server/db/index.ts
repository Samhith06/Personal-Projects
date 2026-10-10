import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

/**
 * A single libSQL connection per process.
 *
 * Local development points `DATABASE_URL` at a file; production points it at a
 * hosted libSQL/Turso database, or at a file on a mounted volume. The rest of
 * the app never sees either detail.
 *
 * The connection is opened on the first query rather than on import. `next
 * build` loads every route module to collect page data, and on a host where the
 * database lives on a volume that directory does not exist yet at build time —
 * connecting eagerly failed the build before the server ever started.
 */
type Database = ReturnType<typeof create>;

const globalForDb = globalThis as unknown as { fgdrDb?: Database };

function create() {
  const url = process.env.DATABASE_URL ?? 'file:./fgdr.db';
  const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
  return drizzle(client, { schema });
}

function connection(): Database {
  globalForDb.fgdrDb ??= create();
  return globalForDb.fgdrDb;
}

export const db = new Proxy({} as Database, {
  get(_target, property) {
    const value = Reflect.get(connection() as object, property);
    return typeof value === 'function' ? value.bind(connection()) : value;
  },
  has(_target, property) {
    return Reflect.has(connection() as object, property);
  },
});

export { schema };
