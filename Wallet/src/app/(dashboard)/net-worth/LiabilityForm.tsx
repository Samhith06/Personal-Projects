"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Field";
import { LIABILITY_CATEGORIES, LIABILITY_CATEGORY_LABELS } from "@/lib/categories";
import { addLiability, updateLiability } from "./actions";

export type LiabilityFormValues = {
  id: string;
  name: string;
  category: string;
  currentValue: number;
  interestRate: number;
};

export function LiabilityForm({
  mode = "add",
  initial,
  trigger,
}: {
  mode?: "add" | "edit";
  initial?: LiabilityFormValues;
  trigger?: (open: () => void) => React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "CREDIT_CARD");
  const [currentValue, setCurrentValue] = useState(initial?.currentValue ?? 0);
  const [interestRate, setInterestRate] = useState(initial?.interestRate ?? 0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        name,
        category: category as (typeof LIABILITY_CATEGORIES)[number],
        currentValue,
        interestRate,
      };
      if (mode === "edit" && initial) {
        await updateLiability(initial.id, payload);
      } else {
        await addLiability(payload);
      }
      setOpen(false);
      if (mode === "add") {
        setName("");
        setCurrentValue(0);
        setInterestRate(0);
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
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          + Add liability
        </Button>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={mode === "edit" ? "Edit liability" : "Add liability"}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="liabilityName">Name</Label>
            <Input id="liabilityName" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Car loan - HDFC" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="liabilityCategory">Category</Label>
              <Select id="liabilityCategory" value={category} onChange={(e) => setCategory(e.target.value)}>
                {LIABILITY_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {LIABILITY_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="liabilityValue">Outstanding amount</Label>
              <Input
                id="liabilityValue"
                type="number"
                min={0}
                step="0.01"
                required
                value={currentValue}
                onChange={(e) => setCurrentValue(Number(e.target.value))}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="interestRate">Interest rate % (optional)</Label>
              <Input
                id="interestRate"
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
              />
            </div>
          </div>
          {error ? <p className="text-sm text-negative">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : mode === "edit" ? "Save changes" : "Add liability"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
