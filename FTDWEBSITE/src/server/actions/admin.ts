'use server';

import { revalidatePath } from 'next/cache';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/server/db';
import { announcements, challenges, clips, raffles, siteSettings, streamers, wins } from '@/server/db/schema';
import { getCurrentUser } from '@/server/auth/session';
import type { ActionState } from './member';

async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') throw new Error('FORBIDDEN');
  return user;
}

const url = z
  .string()
  .trim()
  .refine((v) => v === '' || v === '#' || /^https:\/\/[^\s]+$/i.test(v), 'Links must start with https://')
  .transform((v) => (v === '' ? '#' : v));

const optionalId = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v));

/** Curate the homepage: exactly what the front door shows, in order. */
export async function saveFeatured(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, message: 'Admins only.' };
  }

  const clipIds = form.getAll('featuredClipIds').map(String).slice(0, 4);
  const winIds = form.getAll('featuredWinIds').map(String).slice(0, 3);

  const parsed = z
    .object({
      heroTitle: z.string().trim().min(1).max(60),
      heroTagline: z.string().trim().min(1).max(120),
      heroVideoUrl: z.string().trim().url(),
      featuredStreamerId: optionalId,
      featuredChallengeId: optionalId,
      featuredRaffleId: optionalId,
      featuredAnnouncementId: optionalId,
      discordUrl: url,
      xUrl: url,
      instagramUrl: url,
      youtubeUrl: url,
    })
    .safeParse(Object.fromEntries(form));

  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  // Only reference content that exists and is public.
  const [validClips, validWins] = await Promise.all([
    clipIds.length ? db.select({ id: clips.id }).from(clips).where(inArray(clips.id, clipIds)) : [],
    winIds.length ? db.select({ id: wins.id }).from(wins).where(inArray(wins.id, winIds)) : [],
  ]);
  const clipSet = new Set(validClips.map((c) => c.id));
  const winSet = new Set(validWins.map((w) => w.id));

  const values = {
    ...parsed.data,
    featuredClipIds: JSON.stringify(clipIds.filter((id) => clipSet.has(id))),
    featuredWinIds: JSON.stringify(winIds.filter((id) => winSet.has(id))),
    updatedAt: new Date(),
  };

  await db
    .insert(siteSettings)
    .values({ id: 'default', ...values })
    .onConflictDoUpdate({ target: siteSettings.id, set: values });

  // Keep per-row flags in sync for any consumers that read them directly.
  await db.update(clips).set({ isFeatured: false });
  await db.update(wins).set({ isFeatured: false });
  await db.update(raffles).set({ isFeatured: false });
  await db.update(challenges).set({ isFeatured: false });
  await db.update(announcements).set({ isFeatured: false });
  const orderedClips = JSON.parse(values.featuredClipIds) as string[];
  const orderedWins = JSON.parse(values.featuredWinIds) as string[];
  for (const [i, id] of orderedClips.entries()) await db.update(clips).set({ isFeatured: true, featuredOrder: i + 1 }).where(eq(clips.id, id));
  for (const [i, id] of orderedWins.entries()) await db.update(wins).set({ isFeatured: true, featuredOrder: i + 1 }).where(eq(wins.id, id));
  if (values.featuredRaffleId) await db.update(raffles).set({ isFeatured: true }).where(eq(raffles.id, values.featuredRaffleId));
  if (values.featuredChallengeId) await db.update(challenges).set({ isFeatured: true }).where(eq(challenges.id, values.featuredChallengeId));
  if (values.featuredAnnouncementId)
    await db.update(announcements).set({ isFeatured: true }).where(eq(announcements.id, values.featuredAnnouncementId));

  revalidatePath('/', 'layout');
  return { ok: true, message: 'Homepage updated.' };
}

/** Update a creator's public links and bio. */
export async function saveStreamer(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, message: 'Admins only.' };
  }

  const parsed = z
    .object({
      id: z.string().min(1),
      tagline: z.string().trim().max(120),
      bio: z.string().trim().max(800),
      chapterTitle: z.string().trim().max(40),
      quote: z.string().trim().max(120),
      specialty: z.string().trim().max(80),
      biggestWinGame: z.string().trim().max(60),
      portraitUrl: z
        .string()
        .trim()
        .refine((v) => v === '' || /^(https:\/\/|\/)[^\s]+$/i.test(v), 'Portrait must be an https:// URL or a /public path')
        .transform((v) => (v === '' ? null : v)),
      xUrl: url,
      instagramUrl: url,
      youtubeUrl: url,
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid input.' };

  const { id, ...values } = parsed.data;
  await db.update(streamers).set({ ...values, updatedAt: new Date() }).where(eq(streamers.id, id));

  revalidatePath('/', 'layout');
  return { ok: true, message: 'Saved.' };
}
