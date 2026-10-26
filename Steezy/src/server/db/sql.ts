/**
 * Raw SQL on the same pool Drizzle uses, in the shape MattySpins' lib/db.ts
 * has, so the bonus hunt and slot tournament stores (ported from there) read
 * the same. Everything else on the site uses Drizzle.
 */
import type { Pool, PoolClient, QueryResultRow } from 'pg';
import { db } from './index';

const pool = () => (db as unknown as { $client: Pool }).$client;

export async function rows<T extends QueryResultRow>(text: string, values: unknown[] = []): Promise<T[]> {
  const result = await pool().query<T>(text, values);
  return result.rows;
}

export async function one<T extends QueryResultRow>(text: string, values: unknown[] = []): Promise<T | null> {
  return (await rows<T>(text, values))[0] ?? null;
}

/** A statement that changes something; returns whatever it RETURNs. */
export const write = rows;

/** One transaction on one connection: committed if `run` resolves, rolled back if it throws. */
export async function tx<T>(run: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query('BEGIN');
    const result = await run(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
