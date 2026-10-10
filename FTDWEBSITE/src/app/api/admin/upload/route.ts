import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { mediaAssets } from '@/server/db/schema';
import { getStaff } from '@/server/auth/permissions';

/**
 * Image uploads from the admin panel.
 *
 * Returns the public path of the stored image so the form can drop it straight
 * into the field it belongs to. The bytes go into the database rather than the
 * filesystem — see `mediaAssets` for why.
 */

/** 5 MB. Comfortably enough for an avatar or a prize photo at full quality. */
const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
  ['image/avif', 'avif'],
]);

export async function POST(request: Request) {
  const staff = await getStaff();
  if (!staff) return NextResponse.json({ error: 'Admin access only.' }, { status: 403 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'That upload could not be read.' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Choose an image to upload.' }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: 'Images only — PNG, JPEG, WebP, GIF or AVIF.' }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'That image is over 5 MB. Please use a smaller one.' }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const id = `md-${crypto.randomUUID().replace(/-/g, '')}`;

  await db.insert(mediaAssets).values({
    id,
    mimeType: file.type,
    byteSize: bytes.byteLength,
    filename: file.name.slice(0, 120),
    data: bytes,
    uploadedBy: staff.user.id,
  });

  return NextResponse.json({ url: `/api/media/${id}`, name: file.name, size: bytes.byteLength });
}
