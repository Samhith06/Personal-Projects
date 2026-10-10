"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { EXPENSE_CATEGORIES, CATEGORY_LABELS, PAYMENT_METHODS } from "@/lib/categories";
import { addExpense, updateExpense } from "./actions";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export type ExpenseFormValues = {
  id: string;
  amount: number;
  date: string;
  category: string;
  subcategory: string | null;
  paymentMethod: string;
  notes: string | null;
  isRecurring: boolean;
};

export function ExpenseForm({
  mode = "add",
  initial,
  trigger,
}: {
  mode?: "add" | "edit";
  initial?: ExpenseFormValues;
  trigger?: (open: () => void) => React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState(initial?.amount ?? 0);
  const [date, setDate] = useState(initial ? initial.date.slice(0, 10) : todayISO());
  const [category, setCategory] = useState(initial?.category ?? "FOOD");
  const [subcategory, setSubcategory] = useState(initial?.subcategory ?? "");
  const [paymentMethod, setPaymentMethod] = useState(initial?.paymentMethod ?? PAYMENT_METHODS[0]);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [isRecurring, setIsRecurring] = useState(initial?.isRecurring ?? false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        amount,
        date: new Date(date),
        category: category as (typeof EXPENSE_CATEGORIES)[number],
        subcategory,
        paymentMethod,
        notes,
        isRecurring,
      };
      if (mode === "edit" && initial) {
        await updateExpense(initial.id, payload);
      } else {
        await addExpense(payload);
      }
      setOpen(false);
      if (mode === "add") {
        setAmount(0);
        setSubcategory("");
        setNotes("");
        setIsRecurring(false);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {trigger ? (
        trigger(() => setOpen(true))
      ) : (
        <Button size="sm" onClick={() => setOpen(true)}>
          + Add expense
        </Button>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={mode === "edit" ? "Edit expense" : "Add expense"}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                min={0}
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="subcategory">Subcategory (optional)</Label>
              <Input id="subcategory" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label htmlFor="paymentMethod">Payment method</Label>
              <Select
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border bg-surface-raised accent-accent"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
            />
            This is a recurring expense
          </label>
          {error ? <p className="text-sm text-negative">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : mode === "edit" ? "Save changes" : "Add expense"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
