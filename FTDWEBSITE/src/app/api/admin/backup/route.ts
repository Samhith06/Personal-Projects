import { NextResponse } from 'next/server';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createClient } from '@libsql/client';
import { PermissionError, requireMaster } from '@/server/auth/permissions';

export const dynamic = 'force-dynamic';

/**
 * Download a consistent copy of the database.
 *
 * Everything the crew enters — profiles, giveaway log, hunts, and the uploaded
 * images, which are stored as blobs — lives in one SQLite file on one mounted
 * volume. That file is the only copy, and a volume goes wherever its project
 * goes, so a backup that stays on the host protects against a disk fault and
 * nothing else. This hands the file to a person instead.
 *
 * The snapshot is taken with `VACUUM INTO` rather than by reading the live
 * file. Copying a SQLite database byte-for-byte while it is being written to
 * yields a file that looks fine and fails to open later; `VACUUM INTO` takes a
 * transactionally consistent copy of a running database, which is the whole
 * point of a backup.
 *
 * Master admins only: this is every member's Discord identity and Kick link in
 * one download.
 */
export async function GET() {
  try {
    await requireMaster();
  } catch (error) {
    const status = error instanceof PermissionError ? 403 : 500;
    return NextResponse.json({ error: 'Admin access only.' }, { status });
  }

  const url = process.env.DATABASE_URL ?? 'file:./fgdr.db';
  if (!url.startsWith('file:')) {
    // A hosted libSQL database is backed up by its provider, not from here.
    return NextResponse.json(
      { error: 'This database is hosted; take the backup from the provider instead.' },
      { status: 400 },
    );
  }

  let dir: string | undefined;
  try {
    dir = await mkdtemp(path.join(tmpdir(), 'fgdr-backup-'));
    const snapshot = path.join(dir, 'fgdr.db');

    const client = createClient({ url });
    try {
      // The path is ours, not user input, but it still goes in as a bound value.
      await client.execute({ sql: 'VACUUM INTO ?', args: [snapshot] });
    } finally {
      client.close();
    }

    const bytes = await readFile(snapshot);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="fgdr-${stamp}.db"`,
        'Content-Length': String(bytes.byteLength),
        // A database dump must never sit in a CDN or a browser cache.
        'Cache-Control': 'no-store, private',
      },
    });
  } catch (error) {
    console.error('[admin] backup failed', error);
    return NextResponse.json({ error: 'Could not build the backup.' }, { status: 500 });
  } finally {
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
