import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { GrowthAreaChart } from "@/components/charts/GrowthAreaChart";
import { StartingBalanceForm } from "./StartingBalanceForm";
import { ContributionForm } from "./ContributionForm";
import { ContributionsTable, type ContributionRow } from "./ContributionsTable";
import { toNumber, monthLabel } from "@/lib/utils";

export default async function EPFPage() {
  const userId = await requireUserId();

  const [account, contributions] = await Promise.all([
    prisma.pFAccount.findUnique({ where: { userId } }),
    prisma.pFContribution.findMany({
      where: { userId },
      orderBy: { date: "asc" },
    }),
  ]);

  const startingBalance = toNumber(account?.startingBalance ?? 0);
  const currentBalance = toNumber(account?.currentBalance ?? 0);

  const totalEmployee = contributions.reduce((sum, c) => sum + toNumber(c.employeeAmount), 0);
  const totalEmployer = contributions.reduce((sum, c) => sum + toNumber(c.employerAmount), 0);
  const totalInterest = contributions.reduce((sum, c) => sum + toNumber(c.interestAmount), 0);

  const chartData = contributions.reduce<{ label: string; value: number }[]>((acc, c) => {
    const previous = acc.length > 0 ? acc[acc.length - 1].value : startingBalance;
    const value = previous + toNumber(c.employeeAmount) + toNumber(c.employerAmount) + toNumber(c.interestAmount);
    acc.push({ label: monthLabel(c.month, c.year), value });
    return acc;
  }, []);

  const rows: ContributionRow[] = contributions
    .slice()
    .reverse()
    .map((c) => ({
      id: c.id,
      date: c.date.toISOString(),
      employeeAmount: toNumber(c.employeeAmount),
      employerAmount: toNumber(c.employerAmount),
      interestAmount: toNumber(c.interestAmount),
      fromSalary: !!c.incomeEntryId,
    }));

  return (
    <div>
      <PageHeader
        title="EPF / PF"
        description="Your provident fund, tracked as a long-term wealth asset."
        action={
          <div className="flex items-center gap-2">
            <StartingBalanceForm startingBalance={startingBalance} />
            <ContributionForm />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Current PF balance" value={currentBalance} tone="accent" />
        <StatCard label="Total employee contribution" value={totalEmployee} tone="positive" />
        <StatCard label="Total employer contribution" value={totalEmployer} tone="positive" />
        <StatCard label="Total interest earned" value={totalInterest} tone="gold" />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>PF balance growth</CardTitle>
        </CardHeader>
        <CardContent>
          <GrowthAreaChart
            data={chartData}
            color="var(--accent)"
            valueLabel="PF balance"
            emptyMessage="Add a contribution to see your PF balance grow over time."
          />
        </CardContent>
      </Card>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-medium text-muted">Contribution history</h2>
        {rows.length === 0 ? (
          <EmptyState
            title="No PF contributions yet"
            description="Contributions are added automatically when you record a salary entry with PF deductions, or you can add them manually here."
          />
        ) : (
          <ContributionsTable rows={rows} />
        )}
      </div>
    </div>
  );
}
