"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { formatCurrency } from "@/lib/utils";
import {
  addContribution,
  updateCurrentValue,
  updateQuantityGrams,
  updateInterestRate,
  deleteInvestment,
} from "./actions";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function ManageInvestmentModal({
  investmentId,
  name,
  type,
  currentValue,
  quantityGrams,
  interestRatePercent,
}: {
  investmentId: string;
  name: string;
  type: string;
  currentValue: number;
  quantityGrams: number | null;
  interestRatePercent: number | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMetal = type === "GOLD" || type === "SILVER";
  const isDeposit = type === "FIXED_DEPOSIT" || type === "RECURRING_DEPOSIT";
  const [newValue, setNewValue] = useState(currentValue);
  const [grams, setGrams] = useState(quantityGrams ?? 0);
  const [rate, setRate] = useState(interestRatePercent ?? 0);
  const [contribAmount, setContribAmount] = useState(0);
  const [contribDate, setContribDate] = useState(todayISO());

  async function onSaveValue() {
    setLoading(true);
    setError(null);
    try {
      await updateCurrentValue(investmentId, { currentValue: newValue });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function onSaveGrams() {
    setLoading(true);
    setError(null);
    try {
      await updateQuantityGrams(investmentId, { quantityGrams: grams });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function onSaveRate() {
    setLoading(true);
    setError(null);
    try {
      await updateInterestRate(investmentId, { interestRatePercent: rate });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function onAddContribution() {
    if (contribAmount <= 0) return;
    setLoading(true);
    setError(null);
    try {
      await addContribution(investmentId, { amount: contribAmount, date: new Date(contribDate) });
      setContribAmount(0);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete() {
    if (!confirm(`Delete "${name}"? This removes all its contribution history.`)) return;
    setLoading(true);
    try {
      await deleteInvestment(investmentId);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-xs font-medium text-muted hover:text-foreground">
        Manage
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Manage “${name}”`}>
        <div className="space-y-6">
          {isMetal ? (
            <div>
              <Label htmlFor="grams">Quantity held (grams)</Label>
              <div className="flex gap-2">
                <Input
                  id="grams"
                  type="number"
                  min={0}
                  step="0.01"
                  value={grams}
                  onChange={(e) => setGrams(Number(e.target.value))}
                />
                <Button size="sm" onClick={onSaveGrams} disabled={loading}>
                  Save
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-2">
                Current value is recalculated from the live market price whenever this changes.
              </p>
            </div>
          ) : (
            <div>
              <Label htmlFor="newValue">Update current value</Label>
              <div className="flex gap-2">
                <Input
                  id="newValue"
                  type="number"
                  min={0}
                  step="0.01"
                  value={newValue}
                  onChange={(e) => setNewValue(Number(e.target.value))}
                />
                <Button size="sm" onClick={onSaveValue} disabled={loading}>
                  Save
                </Button>
              </div>
              {isDeposit && interestRatePercent ? (
                <p className="mt-1 text-xs text-muted-2">
                  An interest rate is set, so this will be overwritten by the auto-projected value
                  next time the page loads. Update the rate below instead if it&apos;s changed.
                </p>
              ) : null}
            </div>
          )}

          {isDeposit ? (
            <div className="border-t border-border-subtle pt-4">
              <Label htmlFor="rate">Interest rate (% p.a.)</Label>
              <div className="flex gap-2">
                <Input
                  id="rate"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="e.g. 7.1"
                  value={rate || ""}
                  onChange={(e) => setRate(Number(e.target.value))}
                />
                <Button size="sm" onClick={onSaveRate} disabled={loading || rate <= 0}>
                  Save
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-2">
                Sets current value to auto-project from your contributions, compounded quarterly.
              </p>
            </div>
          ) : null}

          <div className="border-t border-border-subtle pt-4">
            <Label htmlFor="contribAmount">Add a contribution / top-up</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                id="contribAmount"
                type="number"
                min={0}
                step="0.01"
                placeholder="Amount"
                value={contribAmount || ""}
                onChange={(e) => setContribAmount(Number(e.target.value))}
              />
              <Input
                type="date"
                value={contribDate}
                onChange={(e) => setContribDate(e.target.value)}
              />
            </div>
            <Button size="sm" className="mt-2" onClick={onAddContribution} disabled={loading}>
              Add contribution
            </Button>
            <p className="mt-2 text-xs text-muted-2">
              Contributing {contribAmount > 0 ? formatCurrency(contribAmount) : "—"} moves money
              from cash into this investment; remember to reduce your cash/bank balance on the
              Net Worth page if this came from savings.
            </p>
          </div>

          {error ? <p className="text-sm text-negative">{error}</p> : null}

          <div className="flex justify-between border-t border-border-subtle pt-4">
            <Button variant="danger" size="sm" onClick={onDelete} disabled={loading}>
              Delete investment
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
