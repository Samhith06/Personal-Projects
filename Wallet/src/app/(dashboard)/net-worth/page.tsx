import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { GrowthAreaChart } from "@/components/charts/GrowthAreaChart";
import { AssetForm } from "./AssetForm";
import { LiabilityForm } from "./LiabilityForm";
import { AssetsTable } from "./AssetsTable";
import { LiabilitiesTable } from "./LiabilitiesTable";
import { toNumber, monthLabel } from "@/lib/utils";
import { computeAndSaveSnapshot } from "@/lib/networth";

export default async function NetWorthPage() {
  const userId = await requireUserId();

  const { totalLiabilities, netWorth } = await computeAndSaveSnapshot(userId);

  const [assets, liabilities, pfAccount, investments, snapshots] = await Promise.all([
    prisma.asset.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.liability.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.pFAccount.findUnique({ where: { userId } }),
    prisma.investment.findMany({ where: { userId } }),
    prisma.netWorthSnapshot.findMany({ where: { userId }, orderBy: [{ year: "asc" }, { month: "asc" }] }),
  ]);

  const pfBalance = toNumber(pfAccount?.currentBalance ?? 0);
  const investmentsValue = investments.reduce((s, i) => s + toNumber(i.currentValue), 0);
  const manualAssetsValue = assets.reduce((s, a) => s + toNumber(a.currentValue), 0);

  const chartData = snapshots.map((s) => ({
    label: monthLabel(s.month, s.year),
    value: toNumber(s.netWorth),
  }));

  const previousSnapshot = snapshots.length >= 2 ? snapshots[snapshots.length - 2] : null;
  const monthlyChange = previousSnapshot ? netWorth - toNumber(previousSnapshot.netWorth) : null;

  const yearAgoSnapshot = snapshots.find((s) => {
    const now = new Date();
    return s.year === now.getFullYear() - 1 && s.month === now.getMonth() + 1;
  });
  const yearlyChange = yearAgoSnapshot ? netWorth - toNumber(yearAgoSnapshot.netWorth) : null;

  return (
    <div>
      <PageHeader
        title="Net Worth"
        description="Total assets minus liabilities, tracked over time."
        action={
          <div className="flex items-center gap-2">
            <LiabilityForm />
            <AssetForm />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Net worth" value={netWorth} tone={netWorth >= 0 ? "accent" : "negative"} />
        <StatCard
          label="Monthly change"
          value={monthlyChange ?? 0}
          tone={monthlyChange === null ? "neutral" : monthlyChange >= 0 ? "positive" : "negative"}
          sub={monthlyChange === null ? "Not enough history yet" : undefined}
        />
        <StatCard
          label="Yearly change"
          value={yearlyChange ?? 0}
          tone={yearlyChange === null ? "neutral" : yearlyChange >= 0 ? "positive" : "negative"}
          sub={yearlyChange === null ? "Not enough history yet" : undefined}
        />
        <StatCard label="Total liabilities" value={totalLiabilities} tone="negative" />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Net worth timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <GrowthAreaChart
            data={chartData}
            color="var(--accent)"
            valueLabel="Net worth"
            emptyMessage="Your net worth timeline builds up as months pass — check back next month."
          />
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-2">Cash &amp; other assets</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{toNumber(manualAssetsValue).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-2">EPF / PF</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{pfBalance.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-2">Investments</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{investmentsValue.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-medium text-muted">
          Cash, bank &amp; other assets
        </h2>
        <p className="mb-3 text-xs text-muted-2">
          EPF/PF and investments are tracked automatically from their own pages and included in
          the totals above — add cash, bank accounts, property, or other assets here.
        </p>
        {assets.length === 0 ? (
          <EmptyState title="No manual assets added yet" description="Add your cash and bank balances to complete your net worth picture." />
        ) : (
          <AssetsTable assets={assets.map((a) => ({ id: a.id, name: a.name, category: a.category, currentValue: toNumber(a.currentValue) }))} />
        )}
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-medium text-muted">Liabilities</h2>
        {liabilities.length === 0 ? (
          <EmptyState title="No liabilities added" description="If you have loans, credit card debt, or BNPL balances, add them here." />
        ) : (
          <LiabilitiesTable
            liabilities={liabilities.map((l) => ({
              id: l.id,
              name: l.name,
              category: l.category,
              currentValue: toNumber(l.currentValue),
              interestRate: toNumber(l.interestRate),
            }))}
          />
        )}
      </div>
    </div>
  );
}
