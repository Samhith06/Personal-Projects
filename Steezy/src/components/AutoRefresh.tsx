'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Re-render the page from the server every `seconds` while it's visible (live hunt / tournament pages). */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
