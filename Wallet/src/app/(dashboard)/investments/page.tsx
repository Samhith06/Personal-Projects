import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { CategoryDonutChart, type DonutSlice } from "@/components/charts/CategoryDonutChart";
import { InvestmentForm } from "./InvestmentForm";
import { ManageInvestmentModal } from "./ManageInvestmentModal";
import { MetalPricesPanel } from "./MetalPricesPanel";
import { LiveRefresh } from "./LiveRefresh";
import { syncAndAggregateMetalHoldings } from "./metals";
import { syncDepositProjections } from "./deposits";
import { toNumber, formatCurrency, formatPercent, formatRelativeToNow } from "@/lib/utils";
import { INVESTMENT_TYPE_LABELS, INVESTMENT_TYPE_COLORS } from "@/lib/categories";
import { cagr, xirr, returnPercent } from "@/lib/finance";

export default async function InvestmentsPage() {
  const userId = await requireUserId();

  const [metalData] = await Promise.all([
    syncAndAggregateMetalHoldings(userId),
    syncDepositProjections(userId),
  ]);

  const investments = await prisma.investment.findMany({
    where: { userId },
    include: { contributions: true },
    orderBy: { investmentDate: "desc" },
  });

  const totalInvested = investments.reduce((s, i) => s + toNumber(i.amountInvested), 0);
  const totalCurrentValue = investments.reduce((s, i) => s + toNumber(i.currentValue), 0);
  const totalPL = totalCurrentValue - totalInvested;
  const overallReturn = returnPercent({ invested: totalInvested, currentValue: totalCurrentValue });

  const allocationMap = new Map<string, number>();
  for (const inv of investments) {
    allocationMap.set(inv.type, (allocationMap.get(inv.type) ?? 0) + toNumber(inv.currentValue));
  }
  const allocationData: DonutSlice[] = Array.from(allocationMap.entries()).map(([type, value]) => ({
    label: INVESTMENT_TYPE_LABELS[type] ?? type,
    value,
    color: INVESTMENT_TYPE_COLORS[type] ?? "#94a3b8",
  }));

  const now = new Date();

  const rows = investments.map((inv) => {
    const invested = toNumber(inv.amountInvested);
    const currentValue = toNumber(inv.currentValue);
    const years = (now.getTime() - inv.investmentDate.getTime()) / (365 * 24 * 60 * 60 * 1000);

    const cagrValue = cagr({ startValue: invested, endValue: currentValue, years });

    const cashFlows = inv.contributions.map((c) => ({ date: c.date, amount: -toNumber(c.amount) }));
    cashFlows.push({ date: now, amount: currentValue });
    const xirrValue = cashFlows.length >= 2 ? xirr(cashFlows) : null;

    return {
      id: inv.id,
      name: inv.name,
      type: inv.type,
      invested,
      currentValue,
      quantityGrams: inv.quantityGrams != null ? toNumber(inv.quantityGrams) : null,
      interestRatePercent: inv.interestRatePercent != null ? toNumber(inv.interestRatePercent) : null,
      pl: currentValue - invested,
      returnPct: returnPercent({ invested, currentValue }),
      cagr: cagrValue,
      xirr: xirrValue,
    };
  });

  return (
    <div>
      <PageHeader
        title="Investments"
        description="SIPs, mutual funds, stocks, deposits, and every other asset you're growing."
        action={<InvestmentForm />}
      />

      <LiveRefresh intervalMs={60000} />
      <MetalPricesPanel data={metalData} updatedLabel={formatRelativeToNow(metalData.fetchedAt)} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total invested" value={totalInvested} tone="neutral" />
        <StatCard label="Current portfolio value" value={totalCurrentValue} tone="accent" />
        <StatCard label="Total profit / loss" value={totalPL} tone={totalPL >= 0 ? "positive" : "negative"} />
        <StatCard
          label="Overall return"
          value={formatPercent(overallReturn)}
          currency={false}
          tone={overallReturn >= 0 ? "positive" : "negative"}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Asset allocation</CardTitle>
        </CardHeader>
        <CardContent>
          {allocationData.length === 0 ? (
            <EmptyState title="No investments yet" />
          ) : (
            <CategoryDonutChart data={allocationData} />
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-medium text-muted">Your investments</h2>
        {rows.length === 0 ? (
          <EmptyState
            title="No investments recorded yet"
            description="Add your first SIP, mutual fund, stock, or deposit to start tracking portfolio performance."
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs uppercase tracking-wide text-muted-2">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium text-right">Invested</th>
                  <th className="px-4 py-3 font-medium text-right">Current value</th>
                  <th className="px-4 py-3 font-medium text-right">P/L</th>
                  <th className="px-4 py-3 font-medium text-right">Return</th>
                  <th className="px-4 py-3 font-medium text-right">CAGR</th>
                  <th className="px-4 py-3 font-medium text-right">XIRR</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-raised/50">
                    <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                    <td className="px-4 py-3">
                      <Badge tone="neutral">{INVESTMENT_TYPE_LABELS[r.type] ?? r.type}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-muted">{formatCurrency(r.invested)}</td>
                    <td className="px-4 py-3 text-right text-foreground">{formatCurrency(r.currentValue)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${r.pl >= 0 ? "text-positive" : "text-negative"}`}>
                      {formatCurrency(r.pl)}
                    </td>
                    <td className={`px-4 py-3 text-right ${r.returnPct >= 0 ? "text-positive" : "text-negative"}`}>
                      {formatPercent(r.returnPct)}
                    </td>
                    <td className="px-4 py-3 text-right text-muted">
                      {Number.isFinite(r.cagr) ? formatPercent(r.cagr) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-muted">
                      {r.xirr !== null && Number.isFinite(r.xirr) ? formatPercent(r.xirr) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ManageInvestmentModal
                        investmentId={r.id}
                        name={r.name}
                        type={r.type}
                        currentValue={r.currentValue}
                        quantityGrams={r.quantityGrams}
                        interestRatePercent={r.interestRatePercent}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
