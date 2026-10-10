"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { saveSalaryProfile } from "./actions";

type Profile = {
  grossMonthly: number;
  employeePFPercent: number;
  employerPFPercent: number;
  incomeTaxMonthly: number;
  professionalTax: number;
  otherDeductions: number;
  creditDay: number;
} | null;

export function SalaryProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    grossMonthly: profile?.grossMonthly ?? 0,
    employeePFPercent: profile?.employeePFPercent ?? 12,
    employerPFPercent: profile?.employerPFPercent ?? 12,
    incomeTaxMonthly: profile?.incomeTaxMonthly ?? 0,
    professionalTax: profile?.professionalTax ?? 0,
    otherDeductions: profile?.otherDeductions ?? 0,
    creditDay: profile?.creditDay ?? 1,
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await saveSalaryProfile(form);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function field(key: keyof typeof form) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [key]: Number(e.target.value) })),
    };
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {profile ? "Edit recurring salary" : "Set up recurring salary"}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Recurring monthly salary"
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <p className="text-sm text-muted">
            Saved once, this generates future monthly salary records automatically.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gross">Gross monthly salary</Label>
              <Input id="gross" type="number" min={0} step="0.01" required {...field("grossMonthly")} />
            </div>
            <div>
              <Label htmlFor="creditDay">Salary credit day</Label>
              <Input id="creditDay" type="number" min={1} max={31} required {...field("creditDay")} />
            </div>
            <div>
              <Label htmlFor="empPF">Employee PF %</Label>
              <Input id="empPF" type="number" min={0} max={100} step="0.01" required {...field("employeePFPercent")} />
            </div>
            <div>
              <Label htmlFor="erPF">Employer PF %</Label>
              <Input id="erPF" type="number" min={0} max={100} step="0.01" required {...field("employerPFPercent")} />
            </div>
            <div>
              <Label htmlFor="tax">Income tax / TDS (monthly)</Label>
              <Input id="tax" type="number" min={0} step="0.01" required {...field("incomeTaxMonthly")} />
            </div>
            <div>
              <Label htmlFor="ptax">Professional tax</Label>
              <Input id="ptax" type="number" min={0} step="0.01" required {...field("professionalTax")} />
            </div>
            <div className="col-span-2">
              <Label htmlFor="other">Other deductions</Label>
              <Input id="other" type="number" min={0} step="0.01" required {...field("otherDeductions")} />
            </div>
          </div>
          {error ? <p className="text-sm text-negative">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
