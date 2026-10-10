"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { ASSET_CATEGORY_LABELS } from "@/lib/categories";
import { deleteAsset } from "./actions";
import { AssetForm, type AssetFormValues } from "./AssetForm";

export function AssetsTable({ assets }: { assets: AssetFormValues[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function onDelete(id: string) {
    if (!confirm("Delete this asset?")) return;
    setDeletingId(id);
    startTransition(async () => {
      await deleteAsset(id);
      setDeletingId(null);
      router.refresh();
    });
  }

  if (assets.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-2">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium text-right">Value</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {assets.map((a) => (
            <tr key={a.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-raised/50">
              <td className="px-4 py-3 font-medium text-foreground">{a.name}</td>
              <td className="px-4 py-3">
                <Badge tone="neutral">{ASSET_CATEGORY_LABELS[a.category] ?? a.category}</Badge>
              </td>
              <td className="px-4 py-3 text-right text-positive">{formatCurrency(a.currentValue)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-3">
                  <AssetForm
                    mode="edit"
                    initial={a}
                    trigger={(open) => (
                      <button onClick={open} className="text-xs font-medium text-muted hover:text-foreground">
                        Edit
                      </button>
                    )}
                  />
                  <button
                    onClick={() => onDelete(a.id)}
                    disabled={pending && deletingId === a.id}
                    className="text-xs font-medium text-muted hover:text-negative disabled:opacity-50"
                  >
                    {pending && deletingId === a.id ? "…" : "Delete"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
