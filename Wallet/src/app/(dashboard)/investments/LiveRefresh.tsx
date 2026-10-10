"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Silently re-fetches the server component tree on an interval, so
 * server-computed live metal prices keep updating without a manual reload. */
export function LiveRefresh({ intervalMs = 60000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
