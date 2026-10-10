"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { addGoal, updateGoal } from "./actions";

export type GoalFormValues = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  monthlyContribution: number;
};

function defaultTargetDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export function GoalForm({
  mode = "add",
  initial,
  trigger,
}: {
  mode?: "add" | "edit";
  initial?: GoalFormValues;
  trigger?: (open: () => void) => React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initial?.name ?? "");
  const [targetAmount, setTargetAmount] = useState(initial?.targetAmount ?? 0);
  const [currentAmount, setCurrentAmount] = useState(initial?.currentAmount ?? 0);
  const [targetDate, setTargetDate] = useState(initial ? initial.targetDate.slice(0, 10) : defaultTargetDate());
  const [monthlyContribution, setMonthlyContribution] = useState(initial?.monthlyContribution ?? 0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        name,
        targetAmount,
        currentAmount,
        targetDate: new Date(targetDate),
        monthlyContribution,
      };
      if (mode === "edit" && initial) {
        await updateGoal(initial.id, payload);
      } else {
        await addGoal(payload);
      }
      setOpen(false);
      if (mode === "add") {
        setName("");
        setTargetAmount(0);
        setCurrentAmount(0);
        setMonthlyContribution(0);
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
          + Add goal
        </Button>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={mode === "edit" ? "Edit goal" : "Add financial goal"}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="goalName">Goal name</Label>
            <Input id="goalName" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emergency fund" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="targetAmount">Target amount</Label>
              <Input
                id="targetAmount"
                type="number"
                min={0}
                step="0.01"
                required
                value={targetAmount}
                onChange={(e) => setTargetAmount(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="currentAmount">Current amount saved</Label>
              <Input
                id="currentAmount"
                type="number"
                min={0}
                step="0.01"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="targetDate">Target date</Label>
              <Input
                id="targetDate"
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="monthlyContribution">Planned monthly contribution</Label>
              <Input
                id="monthlyContribution"
                type="number"
                min={0}
                step="0.01"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(Number(e.target.value))}
              />
            </div>
          </div>
          {error ? <p className="text-sm text-negative">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : mode === "edit" ? "Save changes" : "Add goal"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
