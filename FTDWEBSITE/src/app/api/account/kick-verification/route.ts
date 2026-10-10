import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/auth/session';
import { latestVerification } from '@/server/kick/chat-verification';
import { ensureChatWatcher } from '@/server/kick/chat-watcher';

export const dynamic = 'force-dynamic';

/** Polled by the account page while a chat code is on screen. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const v = await latestVerification(user.id);
  // Keeps the watcher alive across dev reloads / server restarts.
  if (v?.status === 'pending') await ensureChatWatcher();

  return NextResponse.json(
    {
      status: v?.status ?? 'none',
      failureReason: v?.failureReason ?? null,
      kickUsername: user.kickVerified ? user.kickUsername : null,
      channel: v?.matchedChannel ?? null,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
