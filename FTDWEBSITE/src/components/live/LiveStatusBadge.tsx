'use client';

import { compact } from '@/lib/format';
import { StatusBadge } from '@/components/ui/primitives';
import { useLive } from './LiveProvider';

/** Live/offline badge that stays current as the live poll updates. */
export function LiveStatusBadge({ streamerId, showViewers = false }: { streamerId: string; showViewers?: boolean }) {
  const state = useLive()[streamerId];
  return (
    <>
      <StatusBadge live={Boolean(state?.isLive)} />
      {showViewers && state?.isLive && state.viewers ? (
        <span className="tabular">{compact(state.viewers)} watching</span>
      ) : null}
    </>
  );
}
