'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/server/auth/session';
import { claimMilestone } from '@/server/services/milestones';

export async function claimMilestoneAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const result = await claimMilestone(user.id, String(formData.get('milestoneId') ?? ''));
  redirect(`/milestones?claim=${result}`);
}
