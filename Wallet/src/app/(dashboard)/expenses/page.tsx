import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { CategoryDonutChart, type DonutSlice } from "@/components/charts/CategoryDonutChart";
import { ExpenseForm } from "./ExpenseForm";
import { ExpensesTable, type ExpenseRow } from "./ExpensesTable";
import { toNumber, formatCurrency } from "@/lib/utils";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/categories";
import { percentChange } from "@/lib/finance";

export default async function ExpensesPage() {
  const userId = await requireUserId();

  const expenses = await prisma.expense.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });

  const rows: ExpenseRow[] = expenses.map((e) => ({
    id: e.id,
    amount: toNumber(e.amount),
    date: e.date.toISOString(),
    category: e.category,
    subcategory: e.subcategory,
    paymentMethod: e.paymentMethod,
    notes: e.notes,
    isRecurring: e.isRecurring,
  }));

  const now = new Date();
  const thisMonth = { m: now.getMonth(), y: now.getFullYear() };
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = { m: lastMonthDate.getMonth(), y: lastMonthDate.getFullYear() };

  function inMonth(dateISO: string, target: { m: number; y: number }) {
    const d = new Date(dateISO);
    return d.getMonth() === target.m && d.getFullYear() === target.y;
  }

  const thisMonthRows = rows.filter((r) => inMonth(r.date, thisMonth));
  const lastMonthRows = rows.filter((r) => inMonth(r.date, lastMonth));

  const thisMonthTotal = thisMonthRows.reduce((s, r) => s + r.amount, 0);
  const lastMonthTotal = lastMonthRows.reduce((s, r) => s + r.amount, 0);
  const overallChange = percentChange(thisMonthTotal, lastMonthTotal);

  const categoryTotals = new Map<string, number>();
  for (const r of thisMonthRows) {
    categoryTotals.set(r.category, (categoryTotals.get(r.category) ?? 0) + r.amount);
  }
  const donutData: DonutSlice[] = Array.from(categoryTotals.entries()).map(([category, value]) => ({
    label: CATEGORY_LABELS[category] ?? category,
    value,
    color: CATEGORY_COLORS[category] ?? "#94a3b8",
  }));

  const lastMonthCategoryTotals = new Map<string, number>();
  for (const r of lastMonthRows) {
    lastMonthCategoryTotals.set(r.category, (lastMonthCategoryTotals.get(r.category) ?? 0) + r.amount);
  }

  const categoryInsights = Array.from(categoryTotals.entries())
    .map(([category, value]) => {
      const prev = lastMonthCategoryTotals.get(category) ?? 0;
      const change = percentChange(value, prev);
      return { category, value, prev, change };
    })
    .filter((c) => c.change !== null && Number.isFinite(c.change) && c.prev > 0)
    .sort((a, b) => Math.abs(b.change!) - Math.abs(a.change!))
    .slice(0, 2);

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Track daily spending and see where your money goes."
        action={<ExpenseForm />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="This month" value={thisMonthTotal} tone="negative" />
        <StatCard label="Last month" value={lastMonthTotal} tone="neutral" />
        <StatCard
          label="Month-over-month"
          value={overallChange === null ? "—" : `${overallChange > 0 ? "+" : ""}${overallChange.toFixed(1)}%`}
          currency={false}
          tone={overallChange === null ? "neutral" : overallChange > 0 ? "negative" : "positive"}
        />
      </div>

      {categoryInsights.length > 0 ? (
        <div className="mt-4 space-y-2">
          {categoryInsights.map((c) => (
            <div
              key={c.category}
              className="rounded-xl border border-border-subtle bg-surface-raised px-4 py-2.5 text-sm text-muted"
            >
              You spent{" "}
              <span className={c.change! > 0 ? "font-medium text-negative" : "font-medium text-positive"}>
                {Math.abs(c.change!).toFixed(0)}% {c.change! > 0 ? "more" : "less"}
              </span>{" "}
              on <span className="text-foreground">{CATEGORY_LABELS[c.category]}</span> this month (
              {formatCurrency(c.value)}) than last month ({formatCurrency(c.prev)}).
            </div>
          ))}
        </div>
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>This month by category</CardTitle>
        </CardHeader>
        <CardContent>
          {donutData.length === 0 ? (
            <EmptyState title="No expenses this month yet" />
          ) : (
            <CategoryDonutChart data={donutData} />
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-medium text-muted">All expenses</h2>
        {rows.length === 0 ? (
          <EmptyState
            title="No expenses recorded yet"
            description="Add your first expense to start tracking where your money goes."
          />
        ) : (
          <ExpensesTable expenses={rows} />
        )}
      </div>
    </div>
  );
}
