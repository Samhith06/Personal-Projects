import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { GrowthAreaChart } from "@/components/charts/GrowthAreaChart";
import { DualBarChart } from "@/components/charts/DualBarChart";
import { CategoryDonutChart, type DonutSlice } from "@/components/charts/CategoryDonutChart";
import { toNumber, formatCurrency, monthLabel } from "@/lib/utils";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/categories";
import {
  cashFlowRemaining,
  savingsRate,
  monthlyWealthGrowth,
  percentChange,
  requiredMonthlyContribution,
} from "@/lib/finance";
import { computeAndSaveSnapshot } from "@/lib/networth";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function lastNMonths(n: number) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1, key: monthKey(d) };
  });
}

export default async function DashboardPage() {
  const userId = await requireUserId();

  const now = new Date();
  const thisMonthKey = monthKey(now);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = monthKey(lastMonthDate);

  const [incomeEntries, expenses, pfContributions, pfAccount, investments, goals, netWorthNow] =
    await Promise.all([
      prisma.incomeEntry.findMany({ where: { userId } }),
      prisma.expense.findMany({ where: { userId } }),
      prisma.pFContribution.findMany({ where: { userId }, orderBy: { date: "asc" } }),
      prisma.pFAccount.findUnique({ where: { userId } }),
      prisma.investment.findMany({ where: { userId }, include: { contributions: true } }),
      prisma.goal.findMany({ where: { userId } }),
      computeAndSaveSnapshot(userId),
    ]);

  const snapshots = await prisma.netWorthSnapshot.findMany({
    where: { userId },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  // ---- This month / last month rollups ----
  const incomeByMonth = (key: string) =>
    incomeEntries
      .filter((e) => monthKey(e.date) === key)
      .reduce((s, e) => s + toNumber(e.netAmount), 0);
  const expensesByMonth = (key: string) =>
    expenses.filter((e) => monthKey(e.date) === key).reduce((s, e) => s + toNumber(e.amount), 0);
  const employeePFByMonth = (key: string) =>
    pfContributions
      .filter((c) => monthKey(c.date) === key)
      .reduce((s, c) => s + toNumber(c.employeeAmount), 0);
  const employerPFByMonth = (key: string) =>
    pfContributions
      .filter((c) => monthKey(c.date) === key)
      .reduce((s, c) => s + toNumber(c.employerAmount), 0);

  const allContributions = investments.flatMap((i) => i.contributions);
  const investmentsByMonth = (key: string) =>
    allContributions
      .filter((c) => monthKey(c.date) === key)
      .reduce((s, c) => s + toNumber(c.amount), 0);

  const incomeThisMonth = incomeByMonth(thisMonthKey);
  const expensesThisMonth = expensesByMonth(thisMonthKey);
  const employeePFThisMonth = employeePFByMonth(thisMonthKey);
  const employerPFThisMonth = employerPFByMonth(thisMonthKey);
  const investmentsThisMonth = investmentsByMonth(thisMonthKey);

  const cashRemaining = cashFlowRemaining({
    netSalary: incomeThisMonth,
    otherIncome: 0,
    expenses: expensesThisMonth,
  });
  const cashSavingsThisMonth = cashRemaining - investmentsThisMonth;
  const savingsRateThisMonth = savingsRate({
    netSalary: incomeThisMonth,
    otherIncome: 0,
    expenses: expensesThisMonth,
  });
  const wealthGrowthThisMonth = monthlyWealthGrowth({
    netSalary: incomeThisMonth,
    otherIncome: 0,
    expenses: expensesThisMonth,
    employeePF: employeePFThisMonth,
    employerPF: employerPFThisMonth,
  });

  const { netWorth } = netWorthNow;

  // ---- Charts: last 6 months ----
  const months = lastNMonths(6);
  const incomeExpenseData = months.map((m) => ({
    label: monthLabel(m.month, m.year),
    income: incomeByMonth(m.key),
    expenses: expensesByMonth(m.key),
  }));

  const netWorthChartData = snapshots.map((s) => ({
    label: monthLabel(s.month, s.year),
    value: toNumber(s.netWorth),
  }));

  const pfStartingBalance = toNumber(pfAccount?.startingBalance ?? 0);
  const pfChartData = pfContributions.reduce<{ label: string; value: number }[]>((acc, c) => {
    const previous = acc.length > 0 ? acc[acc.length - 1].value : pfStartingBalance;
    const value = previous + toNumber(c.employeeAmount) + toNumber(c.employerAmount) + toNumber(c.interestAmount);
    acc.push({ label: monthLabel(c.month, c.year), value });
    return acc;
  }, []);

  const expensesThisMonthByCategory = new Map<string, number>();
  for (const e of expenses.filter((e) => monthKey(e.date) === thisMonthKey)) {
    expensesThisMonthByCategory.set(e.category, (expensesThisMonthByCategory.get(e.category) ?? 0) + toNumber(e.amount));
  }
  const donutData: DonutSlice[] = Array.from(expensesThisMonthByCategory.entries()).map(([category, value]) => ({
    label: CATEGORY_LABELS[category] ?? category,
    value,
    color: CATEGORY_COLORS[category] ?? "#94a3b8",
  }));

  const totalInvested = investments.reduce((s, i) => s + toNumber(i.amountInvested), 0);
  const totalCurrentValue = investments.reduce((s, i) => s + toNumber(i.currentValue), 0);

  // ---- Insights (simple, rule-based) ----
  const insights: string[] = [];

  const expenseChange = percentChange(expensesThisMonth, expensesByMonth(lastMonthKey));
  if (expenseChange !== null && expensesByMonth(lastMonthKey) > 0) {
    insights.push(
      `Your expenses ${expenseChange > 0 ? "increased" : "decreased"} by ${Math.abs(expenseChange).toFixed(0)}% this month.`
    );
  }

  if (incomeThisMonth > 0) {
    insights.push(`Your savings rate is ${savingsRateThisMonth.toFixed(0)}% this month.`);
  }

  if (investmentsThisMonth > 0) {
    insights.push(`Your investments increased by ${formatCurrency(investmentsThisMonth)} this month.`);
  }

  if (snapshots.length >= 2) {
    const prev = toNumber(snapshots[snapshots.length - 2].netWorth);
    const diff = netWorth - prev;
    if (diff !== 0) {
      insights.push(
        `Your net worth ${diff > 0 ? "increased" : "decreased"} by ${formatCurrency(Math.abs(diff))} compared with last month.`
      );
    }
  }

  for (const goal of goals) {
    const target = toNumber(goal.targetAmount);
    const current = toNumber(goal.currentAmount);
    const planned = toNumber(goal.monthlyContribution);
    if (current >= target) continue;
    const required = requiredMonthlyContribution({
      targetAmount: target,
      currentAmount: current,
      targetDate: goal.targetDate,
    });
    if (planned >= required) {
      insights.push(`You're on track to reach your "${goal.name}" goal.`);
      break;
    }
  }

  return (
    <div>
      <PageHeader title="Dashboard" description="Your complete financial picture at a glance." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Income this month" value={incomeThisMonth} tone="positive" />
        <StatCard label="Expenses this month" value={expensesThisMonth} tone="negative" />
        <StatCard label="Investments this month" value={investmentsThisMonth} tone="accent" />
        <StatCard label="Cash savings this month" value={cashSavingsThisMonth} tone={cashSavingsThisMonth >= 0 ? "positive" : "negative"} />
        <StatCard label="Employee PF this month" value={employeePFThisMonth} tone="gold" />
        <StatCard label="Employer PF this month" value={employerPFThisMonth} tone="gold" />
        <StatCard label="Current net worth" value={netWorth} tone={netWorth >= 0 ? "accent" : "negative"} />
        <StatCard
          label="Monthly wealth growth"
          value={wealthGrowthThisMonth}
          tone={wealthGrowthThisMonth >= 0 ? "positive" : "negative"}
        />
      </div>

      {insights.length > 0 ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {insights.map((text, i) => (
            <div key={i} className="rounded-xl border border-border-subtle bg-surface-raised px-4 py-2.5 text-sm text-muted">
              {text}
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Income vs expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <DualBarChart
              data={incomeExpenseData}
              aKey="income"
              bKey="expenses"
              aLabel="Income"
              bLabel="Expenses"
              aColor="var(--positive)"
              bColor="var(--negative)"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expense breakdown this month</CardTitle>
          </CardHeader>
          <CardContent>
            {donutData.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-muted">
                No expenses recorded this month.
              </div>
            ) : (
              <CategoryDonutChart data={donutData} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Net worth growth</CardTitle>
          </CardHeader>
          <CardContent>
            <GrowthAreaChart
              data={netWorthChartData}
              color="var(--accent)"
              valueLabel="Net worth"
              emptyMessage="Your net worth timeline builds as months pass."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>PF balance growth</CardTitle>
          </CardHeader>
          <CardContent>
            <GrowthAreaChart
              data={pfChartData}
              color="var(--gold)"
              valueLabel="PF balance"
              emptyMessage="Add PF contributions to see growth over time."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Investment performance</CardTitle>
          </CardHeader>
          <CardContent>
            <DualBarChart
              data={[{ label: "Portfolio", invested: totalInvested, currentValue: totalCurrentValue }]}
              aKey="invested"
              bKey="currentValue"
              aLabel="Invested"
              bLabel="Current value"
              aColor="var(--muted-2)"
              bColor="var(--accent)"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Savings rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 flex-col items-center justify-center">
              <p className="text-5xl font-semibold text-positive">{savingsRateThisMonth.toFixed(0)}%</p>
              <p className="mt-2 text-sm text-muted">of income saved or invested this month</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
