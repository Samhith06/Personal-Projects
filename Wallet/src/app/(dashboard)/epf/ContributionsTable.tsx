"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { deleteManualContribution } from "./actions";

export type ContributionRow = {
  id: string;
  date: string;
  employeeAmount: number;
  employerAmount: number;
  interestAmount: number;
  fromSalary: boolean;
};

export function ContributionsTable({ rows }: { rows: ContributionRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function onDelete(id: string) {
    if (!confirm("Delete this PF contribution?")) return;
    setDeletingId(id);
    startTransition(async () => {
      await deleteManualContribution(id);
      setDeletingId(null);
      router.refresh();
    });
  }

  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-2">
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Source</th>
            <th className="px-4 py-3 font-medium text-right">Employee</th>
            <th className="px-4 py-3 font-medium text-right">Employer</th>
            <th className="px-4 py-3 font-medium text-right">Interest</th>
            <th className="px-4 py-3 font-medium text-right">Total</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-raised/50">
              <td className="px-4 py-3 text-muted">
                {new Date(row.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </td>
              <td className="px-4 py-3">
                <Badge tone={row.fromSalary ? "accent" : "neutral"}>
                  {row.fromSalary ? "From salary" : "Manual"}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right text-foreground">{formatCurrency(row.employeeAmount)}</td>
              <td className="px-4 py-3 text-right text-foreground">{formatCurrency(row.employerAmount)}</td>
              <td className="px-4 py-3 text-right text-gold">{formatCurrency(row.interestAmount)}</td>
              <td className="px-4 py-3 text-right font-medium text-positive">
                {formatCurrency(row.employeeAmount + row.employerAmount + row.interestAmount)}
              </td>
              <td className="px-4 py-3 text-right">
                {row.fromSalary ? (
                  <span className="text-xs text-muted-2">—</span>
                ) : (
                  <button
                    onClick={() => onDelete(row.id)}
                    disabled={pending && deletingId === row.id}
                    className="text-xs font-medium text-muted hover:text-negative disabled:opacity-50"
                  >
                    {pending && deletingId === row.id ? "…" : "Delete"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
