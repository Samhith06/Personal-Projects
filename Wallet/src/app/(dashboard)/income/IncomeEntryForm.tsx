"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { addIncomeEntry } from "./actions";

const sources = [
  { value: "SALARY", label: "Salary" },
  { value: "BONUS", label: "Bonus" },
  { value: "FREELANCE", label: "Freelance" },
  { value: "BUSINESS", label: "Business" },
  { value: "OTHER", label: "Other" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function IncomeEntryForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [source, setSource] = useState("SALARY");
  const [date, setDate] = useState(todayISO());
  const [gross, setGross] = useState(0);
  const [employeePF, setEmployeePF] = useState(0);
  const [employerPF, setEmployerPF] = useState(0);
  const [incomeTax, setIncomeTax] = useState(0);
  const [professionalTax, setProfessionalTax] = useState(0);
  const [otherDeductions, setOtherDeductions] = useState(0);
  const [notes, setNotes] = useState("");

  const isSalary = source === "SALARY";
  const net = gross - employeePF - incomeTax - professionalTax - otherDeductions;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const d = new Date(date);
    try {
      await addIncomeEntry({
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        source: source as "SALARY" | "BONUS" | "FREELANCE" | "BUSINESS" | "OTHER",
        grossAmount: gross,
        employeePF: isSalary ? employeePF : 0,
        employerPF: isSalary ? employerPF : 0,
        incomeTax: isSalary ? incomeTax : 0,
        professionalTax: isSalary ? professionalTax : 0,
        otherDeductions: isSalary ? otherDeductions : 0,
        date: d,
        notes,
      });
      setOpen(false);
      setGross(0);
      setEmployeePF(0);
      setEmployerPF(0);
      setIncomeTax(0);
      setProfessionalTax(0);
      setOtherDeductions(0);
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
        + Add income
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add income entry">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="source">Source</Label>
              <Select id="source" value={source} onChange={(e) => setSource(e.target.value)}>
                {sources.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label htmlFor="gross">{isSalary ? "Gross salary" : "Amount"}</Label>
              <Input
                id="gross"
                type="number"
                min={0}
                step="0.01"
                required
                value={gross}
                onChange={(e) => setGross(Number(e.target.value))}
              />
            </div>
          </div>

          {isSalary ? (
            <div className="rounded-xl border border-border-subtle bg-surface-raised p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-2">
                Deductions
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="empPF">Employee PF</Label>
                  <Input
                    id="empPF"
                    type="number"
                    min={0}
                    step="0.01"
                    value={employeePF}
                    onChange={(e) => setEmployeePF(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="erPF">Employer PF</Label>
                  <Input
                    id="erPF"
                    type="number"
                    min={0}
                    step="0.01"
                    value={employerPF}
                    onChange={(e) => setEmployerPF(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="tax">Income tax / TDS</Label>
                  <Input
                    id="tax"
                    type="number"
                    min={0}
                    step="0.01"
                    value={incomeTax}
                    onChange={(e) => setIncomeTax(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="ptax">Professional tax</Label>
                  <Input
                    id="ptax"
                    type="number"
                    min={0}
                    step="0.01"
                    value={professionalTax}
                    onChange={(e) => setProfessionalTax(Number(e.target.value))}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="other">Other deductions</Label>
                  <Input
                    id="other"
                    type="number"
                    min={0}
                    step="0.01"
                    value={otherDeductions}
                    onChange={(e) => setOtherDeductions(Number(e.target.value))}
                  />
                </div>
              </div>
              <p className="mt-3 text-sm text-muted">
                Net salary received: <span className="font-semibold text-positive">₹{net.toLocaleString("en-IN")}</span>
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
              {loading ? "Saving…" : "Add entry"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
