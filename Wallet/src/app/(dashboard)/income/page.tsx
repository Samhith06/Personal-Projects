import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { DeductionFlow } from "@/components/ui/DeductionFlow";
import { GrowthAreaChart } from "@/components/charts/GrowthAreaChart";
import { SalaryProfileForm } from "./SalaryProfileForm";
import { IncomeEntryForm } from "./IncomeEntryForm";
import { GenerateEntryButton } from "./GenerateEntryButton";
import { IncomeEntriesTable, type IncomeEntryRow } from "./IncomeEntriesTable";
import { toNumber, monthLabel } from "@/lib/utils";

export default async function IncomePage() {
  const userId = await requireUserId();

  const [profile, entries] = await Promise.all([
    prisma.salaryProfile.findUnique({ where: { userId } }),
    prisma.incomeEntry.findMany({
      where: { userId },
      orderBy: { date: "desc" },
    }),
  ]);

  const rows: IncomeEntryRow[] = entries.map((e) => ({
    id: e.id,
    date: e.date.toISOString(),
    source: e.source,
    grossAmount: toNumber(e.grossAmount),
    employeePF: toNumber(e.employeePF),
    employerPF: toNumber(e.employerPF),
    netAmount: toNumber(e.netAmount),
    notes: e.notes,
  }));

  const salaryEntries = entries.filter((e) => e.source === "SALARY").slice().reverse();
  const chartData = salaryEntries.map((e) => ({
    label: monthLabel(e.month, e.year),
    value: toNumber(e.netAmount),
  }));

  return (
    <div>
      <PageHeader
        title="Income & Salary"
        description="Manage your recurring salary and one-off income."
        action={
          <div className="flex items-center gap-2">
            {profile ? <GenerateEntryButton /> : null}
            <IncomeEntryForm />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Recurring salary profile</CardTitle>
            <SalaryProfileForm
              profile={
                profile
                  ? {
                      grossMonthly: toNumber(profile.grossMonthly),
                      employeePFPercent: toNumber(profile.employeePFPercent),
                      employerPFPercent: toNumber(profile.employerPFPercent),
                      incomeTaxMonthly: toNumber(profile.incomeTaxMonthly),
                      professionalTax: toNumber(profile.professionalTax),
                      otherDeductions: toNumber(profile.otherDeductions),
                      creditDay: profile.creditDay,
                    }
                  : null
              }
            />
          </CardHeader>
          <CardContent>
            {profile ? (
              <DeductionFlow
                gross={toNumber(profile.grossMonthly)}
                rows={[
                  {
                    label: `Employee PF (${toNumber(profile.employeePFPercent)}%)`,
                    amount: (toNumber(profile.grossMonthly) * toNumber(profile.employeePFPercent)) / 100,
                  },
                  { label: "Income tax / TDS", amount: toNumber(profile.incomeTaxMonthly) },
                  { label: "Professional tax", amount: toNumber(profile.professionalTax) },
                  { label: "Other deductions", amount: toNumber(profile.otherDeductions) },
                ]}
                net={
                  toNumber(profile.grossMonthly) -
                  (toNumber(profile.grossMonthly) * toNumber(profile.employeePFPercent)) / 100 -
                  toNumber(profile.incomeTaxMonthly) -
                  toNumber(profile.professionalTax) -
                  toNumber(profile.otherDeductions)
                }
              />
            ) : (
              <EmptyState
                title="No recurring salary set up"
                description="Save your monthly salary details once so future entries can be generated automatically."
              />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Salary growth</CardTitle>
          </CardHeader>
          <CardContent>
            <GrowthAreaChart
              data={chartData}
              color="var(--positive)"
              valueLabel="Net salary"
              emptyMessage="Add income entries to see salary growth over time."
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-medium text-muted">Income history</h2>
        {rows.length === 0 ? (
          <EmptyState
            title="No income recorded yet"
            description="Add your first salary credit, bonus, or freelance payment."
          />
        ) : (
          <IncomeEntriesTable entries={rows} />
        )}
      </div>
    </div>
  );
}
