'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/server/auth/session';
import { enterGiveaway } from '@/server/services/giveaways';

export async function enterGiveawayAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(fd.get('giveawayId') ?? '');
  const { result, problems } = await enterGiveaway(id, user.id, 'site');
  const params = new URLSearchParams({ g: id, entry: result });
  if (problems?.length) params.set('why', problems.join(' · '));
  redirect(`/giveaways?${params}`);
}
