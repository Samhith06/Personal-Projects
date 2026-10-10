"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { generateEntryFromProfile } from "./actions";

export function GenerateEntryButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    try {
      await generateEntryFromProfile();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" size="sm" onClick={onClick} disabled={loading}>
        {loading ? "Generating…" : "Generate this month's salary"}
      </Button>
      {error ? <p className="text-xs text-negative">{error}</p> : null}
    </div>
  );
}
