"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { addManualContribution } from "./actions";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function ContributionForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [employeeAmount, setEmployeeAmount] = useState(0);
  const [employerAmount, setEmployerAmount] = useState(0);
  const [interestAmount, setInterestAmount] = useState(0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const d = new Date(date);
    try {
      await addManualContribution({
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        employeeAmount,
        employerAmount,
        interestAmount,
        date: d,
      });
      setOpen(false);
      setEmployeeAmount(0);
      setEmployerAmount(0);
      setInterestAmount(0);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        + Add contribution
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add PF contribution">
        <form onSubmit={onSubmit} className="space-y-4">
          <p className="text-sm text-muted">
            Use this for interest credits or corrections. Salary-linked contributions
            are created automatically from the Income &amp; Salary page.
          </p>
          <div>
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="empAmt">Employee contribution</Label>
              <Input
                id="empAmt"
                type="number"
                min={0}
                step="0.01"
                value={employeeAmount}
                onChange={(e) => setEmployeeAmount(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="erAmt">Employer contribution</Label>
              <Input
                id="erAmt"
                type="number"
                min={0}
                step="0.01"
                value={employerAmount}
                onChange={(e) => setEmployerAmount(Number(e.target.value))}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="interest">Interest earned</Label>
              <Input
                id="interest"
                type="number"
                min={0}
                step="0.01"
                value={interestAmount}
                onChange={(e) => setInterestAmount(Number(e.target.value))}
              />
            </div>
          </div>
          {error ? <p className="text-sm text-negative">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : "Add"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
