"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { deleteIncomeEntry } from "./actions";

export type IncomeEntryRow = {
  id: string;
  date: string;
  source: string;
  grossAmount: number;
  employeePF: number;
  employerPF: number;
  netAmount: number;
  notes: string | null;
};

const sourceTone: Record<string, "accent" | "positive" | "neutral"> = {
  SALARY: "accent",
  BONUS: "positive",
  FREELANCE: "neutral",
  BUSINESS: "neutral",
  OTHER: "neutral",
};

export function IncomeEntriesTable({ entries }: { entries: IncomeEntryRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function onDelete(id: string) {
    if (!confirm("Delete this income entry? Any linked PF contribution will also be reversed.")) return;
    setDeletingId(id);
    startTransition(async () => {
      await deleteIncomeEntry(id);
      setDeletingId(null);
      router.refresh();
    });
  }

  if (entries.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-2">
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Source</th>
            <th className="px-4 py-3 font-medium text-right">Gross</th>
            <th className="px-4 py-3 font-medium text-right">PF (emp+er)</th>
            <th className="px-4 py-3 font-medium text-right">Net</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-raised/50">
              <td className="px-4 py-3 text-muted">
                {new Date(entry.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </td>
              <td className="px-4 py-3">
                <Badge tone={sourceTone[entry.source] ?? "neutral"}>{entry.source}</Badge>
              </td>
              <td className="px-4 py-3 text-right text-foreground">{formatCurrency(entry.grossAmount)}</td>
              <td className="px-4 py-3 text-right text-muted">
                {entry.employeePF + entry.employerPF > 0
                  ? formatCurrency(entry.employeePF + entry.employerPF)
                  : "—"}
              </td>
              <td className="px-4 py-3 text-right font-medium text-positive">
                {formatCurrency(entry.netAmount)}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => onDelete(entry.id)}
                  disabled={pending && deletingId === entry.id}
                  className="text-xs font-medium text-muted hover:text-negative disabled:opacity-50"
                >
                  {pending && deletingId === entry.id ? "…" : "Delete"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
