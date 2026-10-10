import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { mediaAssets } from '@/server/db/schema';

/**
 * Serves an image uploaded from the admin panel.
 *
 * The id is content-addressed in practice — a new upload gets a new id — so
 * the response is safe to cache hard and forever.
 */
export async function GET(_request: Request, ctx: RouteContext<'/api/media/[id]'>) {
  const { id } = await ctx.params;
  const [row] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
  if (!row) return new Response('Not found', { status: 404 });

  const data = row.data as Buffer | Uint8Array;
  const body = data instanceof Uint8Array ? data : new Uint8Array(data);

  return new Response(body as BodyInit, {
    headers: {
      'Content-Type': row.mimeType,
      'Content-Length': String(body.byteLength),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
