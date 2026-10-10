'use client';

import { useLive } from '@/components/live/LiveProvider';
import { num } from '@/lib/format';

export function CrewLiveBadge({ streamerId }: { streamerId: string }) {
  const state = useLive()[streamerId];
  if (!state?.isLive) return <span className="pill pill--status">Offline</span>;
  return (
    <span className="pill pill--live" aria-label={state.viewers ? `Live, ${num(state.viewers)} watching` : 'Live now'}>
      <span className="pill__dot" aria-hidden="true" />
      Live{state.viewers ? ` · ${num(state.viewers)}` : ''}
    </span>
  );
}
