'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { LiveMap } from '@/lib/types';

const POLL_MS = 60_000;

const LiveContext = createContext<LiveMap>({});

/**
 * Holds live status for every creator. Seeded by the server render so the
 * first paint is already correct, then refreshed from `/api/live` (which is
 * itself cached server-side) while the tab is visible.
 */
export function LiveProvider({ initial, children }: { initial: LiveMap; children: ReactNode }) {
  const [live, setLive] = useState<LiveMap>(initial);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    let controller: AbortController | undefined;

    const refresh = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const res = await fetch('/api/live', { signal: controller.signal, headers: { Accept: 'application/json' } });
        if (res.ok) setLive((await res.json()) as LiveMap);
      } catch {
        /* network blip — keep the last known state */
      }
    };

    const start = () => {
      clearInterval(timer);
      timer = setInterval(refresh, POLL_MS);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refresh();
        start();
      } else {
        clearInterval(timer);
      }
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(timer);
      controller?.abort();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <LiveContext.Provider value={live}>{children}</LiveContext.Provider>;
}

export function useLive() {
  return useContext(LiveContext);
}

export function useLiveCount() {
  const live = useLive();
  return Object.values(live).filter((s) => s.isLive).length;
}
