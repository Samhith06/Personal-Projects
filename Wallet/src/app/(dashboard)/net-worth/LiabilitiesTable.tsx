"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { LIABILITY_CATEGORY_LABELS } from "@/lib/categories";
import { deleteLiability } from "./actions";
import { LiabilityForm, type LiabilityFormValues } from "./LiabilityForm";

export function LiabilitiesTable({ liabilities }: { liabilities: LiabilityFormValues[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function onDelete(id: string) {
    if (!confirm("Delete this liability?")) return;
    setDeletingId(id);
    startTransition(async () => {
      await deleteLiability(id);
      setDeletingId(null);
      router.refresh();
    });
  }

  if (liabilities.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-2">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium text-right">Outstanding</th>
            <th className="px-4 py-3 font-medium text-right">Interest</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {liabilities.map((l) => (
            <tr key={l.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-raised/50">
              <td className="px-4 py-3 font-medium text-foreground">{l.name}</td>
              <td className="px-4 py-3">
                <Badge tone="neutral">{LIABILITY_CATEGORY_LABELS[l.category] ?? l.category}</Badge>
              </td>
              <td className="px-4 py-3 text-right text-negative">{formatCurrency(l.currentValue)}</td>
              <td className="px-4 py-3 text-right text-muted">{l.interestRate}%</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-3">
                  <LiabilityForm
                    mode="edit"
                    initial={l}
                    trigger={(open) => (
                      <button onClick={open} className="text-xs font-medium text-muted hover:text-foreground">
                        Edit
                      </button>
                    )}
                  />
                  <button
                    onClick={() => onDelete(l.id)}
                    disabled={pending && deletingId === l.id}
                    className="text-xs font-medium text-muted hover:text-negative disabled:opacity-50"
                  >
                    {pending && deletingId === l.id ? "…" : "Delete"}
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
