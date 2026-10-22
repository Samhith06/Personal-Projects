/** The `?ok=` / `?error=` message an admin action redirects back with. */
export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (error) return <p className="notice notice--danger">{error}</p>;
  if (ok) return <p className="notice notice--ok">{ok}</p>;
  return null;
}

export type FlashParams = Promise<{ ok?: string; error?: string }>;
