"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Field";
import { formatCurrency } from "@/lib/utils";
import { EXPENSE_CATEGORIES, CATEGORY_LABELS } from "@/lib/categories";
import { deleteExpense } from "./actions";
import { ExpenseForm, type ExpenseFormValues } from "./ExpenseForm";

export type ExpenseRow = ExpenseFormValues;

const ranges = [
  { value: "all", label: "All time" },
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
] as const;

export function ExpensesTable({ expenses }: { expenses: ExpenseRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [range, setRange] = useState<(typeof ranges)[number]["value"]>("all");

  const filtered = useMemo(() => {
    const now = new Date();
    return expenses.filter((e) => {
      if (category !== "ALL" && e.category !== category) return false;

      if (range !== "all") {
        const d = new Date(e.date);
        const targetMonth = range === "this-month" ? now.getMonth() : now.getMonth() - 1;
        const targetDate = new Date(now.getFullYear(), targetMonth, 1);
        if (d.getMonth() !== targetDate.getMonth() || d.getFullYear() !== targetDate.getFullYear()) {
          return false;
        }
      }

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack = `${e.subcategory ?? ""} ${e.notes ?? ""} ${CATEGORY_LABELS[e.category]} ${e.paymentMethod}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [expenses, category, range, search]);

  function onDelete(id: string) {
    if (!confirm("Delete this expense?")) return;
    setDeletingId(id);
    startTransition(async () => {
      await deleteExpense(id);
      setDeletingId(null);
      router.refresh();
    });
  }

  const total = filtered.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search notes, category, payment method…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-auto">
          <option value="ALL">All categories</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </Select>
        <Select
          value={range}
          onChange={(e) => setRange(e.target.value as typeof range)}
          className="w-auto"
        >
          {ranges.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
        <span className="ml-auto text-sm text-muted">
          {filtered.length} expenses · {formatCurrency(total)}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted">
          No expenses match these filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-2">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-raised/50">
                  <td className="px-4 py-3 text-muted">
                    {new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge tone="neutral">{CATEGORY_LABELS[e.category]}</Badge>
                      {e.isRecurring ? <Badge tone="accent">Recurring</Badge> : null}
                    </div>
                    {e.subcategory ? (
                      <p className="mt-1 text-xs text-muted-2">{e.subcategory}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-muted">{e.paymentMethod}</td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-muted-2">{e.notes || "—"}</td>
                  <td className="px-4 py-3 text-right font-medium text-negative">
                    {formatCurrency(e.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <ExpenseForm
                        mode="edit"
                        initial={e}
                        trigger={(open) => (
                          <button onClick={open} className="text-xs font-medium text-muted hover:text-foreground">
                            Edit
                          </button>
                        )}
                      />
                      <button
                        onClick={() => onDelete(e.id)}
                        disabled={pending && deletingId === e.id}
                        className="text-xs font-medium text-muted hover:text-negative disabled:opacity-50"
                      >
                        {pending && deletingId === e.id ? "…" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
