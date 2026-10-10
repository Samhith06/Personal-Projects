'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Re-render the page from the server every few seconds, so work that arrives
 * from somewhere else (slot calls from Kick chat) shows up without a reload.
 *
 * It holds off while the tab is hidden, and while someone is typing into a
 * field, so a refresh never lands in the middle of a bet being entered.
 */
export function AutoRefresh({ everyMs = 10_000 }: { everyMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLSelectElement || active instanceof HTMLTextAreaElement) {
        return;
      }
      router.refresh();
    }, everyMs);
    return () => clearInterval(timer);
  }, [router, everyMs]);

  return null;
}
