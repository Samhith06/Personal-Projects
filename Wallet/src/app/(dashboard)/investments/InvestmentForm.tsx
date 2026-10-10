"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { INVESTMENT_TYPES, INVESTMENT_TYPE_LABELS } from "@/lib/categories";
import { addInvestment } from "./actions";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function InvestmentForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof INVESTMENT_TYPES)[number]>("MUTUAL_FUND");
  const [amountInvested, setAmountInvested] = useState(0);
  const [investmentDate, setInvestmentDate] = useState(todayISO());
  const [currentValue, setCurrentValue] = useState(0);
  const [quantityGrams, setQuantityGrams] = useState(0);
  const [interestRatePercent, setInterestRatePercent] = useState(0);
  const [notes, setNotes] = useState("");

  const isMetal = type === "GOLD" || type === "SILVER";
  const isDeposit = type === "FIXED_DEPOSIT" || type === "RECURRING_DEPOSIT";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await addInvestment({
        name,
        type,
        amountInvested,
        investmentDate: new Date(investmentDate),
        currentValue,
        quantityGrams: isMetal ? quantityGrams : undefined,
        interestRatePercent: isDeposit && interestRatePercent > 0 ? interestRatePercent : undefined,
        notes,
      });
      setOpen(false);
      setName("");
      setAmountInvested(0);
      setCurrentValue(0);
      setQuantityGrams(0);
      setInterestRatePercent(0);
      setNotes("");
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
        + Add investment
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add investment">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Investment name</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nifty 50 Index Fund" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Type</Label>
              <Select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value as typeof type)}
              >
                {INVESTMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {INVESTMENT_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="investmentDate">Investment date</Label>
              <Input
                id="investmentDate"
                type="date"
                required
                value={investmentDate}
                onChange={(e) => setInvestmentDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="amountInvested">Amount invested so far</Label>
              <Input
                id="amountInvested"
                type="number"
                min={0}
                step="0.01"
                required
                value={amountInvested}
                onChange={(e) => setAmountInvested(Number(e.target.value))}
              />
            </div>
            {isMetal ? (
              <div>
                <Label htmlFor="quantityGrams">Quantity held (grams)</Label>
                <Input
                  id="quantityGrams"
                  type="number"
                  min={0.01}
                  step="0.01"
                  required
                  value={quantityGrams}
                  onChange={(e) => setQuantityGrams(Number(e.target.value))}
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="currentValue">Current value</Label>
                <Input
                  id="currentValue"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={currentValue}
                  onChange={(e) => setCurrentValue(Number(e.target.value))}
                />
              </div>
            )}
          </div>
          {isMetal ? (
            <p className="-mt-2 text-xs text-muted-2">
              Current value is tracked automatically from the live gold/silver price and kept up
              to date on the Investments page.
            </p>
          ) : null}
          {isDeposit ? (
            <div>
              <Label htmlFor="interestRatePercent">Interest rate (% p.a., optional)</Label>
              <Input
                id="interestRatePercent"
                type="number"
                min={0}
                step="0.01"
                placeholder="e.g. 7.1"
                value={interestRatePercent || ""}
                onChange={(e) => setInterestRatePercent(Number(e.target.value))}
              />
              <p className="mt-1 text-xs text-muted-2">
                If set, current value is auto-projected from your contributions (compounded
                quarterly) and kept up to date automatically — overriding the current value above.
              </p>
            </div>
          ) : null}
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {error ? <p className="text-sm text-negative">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : "Add investment"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
