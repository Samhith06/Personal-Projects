import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

/**
 * One Postgres pool per process.
 *
 * The pool is created on the first query rather than on import: `next build`
 * loads every route module, and the build host usually can't reach the
 * database. (Same lazy pattern as FTDWEBSITE.)
 */
type Database = ReturnType<typeof create>;

const globalForDb = globalThis as unknown as { steezyDb?: Database };

function create() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL ?? 'postgres://steezy:steezy@localhost:5432/steezy',
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
  });
  return drizzle(pool, { schema });
}

function connection(): Database {
  globalForDb.steezyDb ??= create();
  return globalForDb.steezyDb;
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
