import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { compoundedValue } from "@/lib/finance";
import type { InvestmentType } from "@/generated/prisma/enums";

const DEPOSIT_TYPES: InvestmentType[] = ["FIXED_DEPOSIT", "RECURRING_DEPOSIT"];

/**
 * For every Fixed/Recurring Deposit with an interest rate set, projects its
 * current value by compounding each contribution (quarterly, the standard
 * bank convention) from its own date forward, and persists the result — so
 * the displayed value keeps growing between manual updates.
 */
export async function syncDepositProjections(userId: string): Promise<void> {
  const deposits = await prisma.investment.findMany({
    where: {
      userId,
      type: { in: DEPOSIT_TYPES },
      interestRatePercent: { not: null },
    },
    include: { contributions: true },
  });

  const now = new Date();

  for (const deposit of deposits) {
    const rate = toNumber(deposit.interestRatePercent);
    if (rate <= 0) continue;

    const cashFlows =
      deposit.contributions.length > 0
        ? deposit.contributions.map((c) => ({ amount: toNumber(c.amount), date: c.date }))
        : [{ amount: toNumber(deposit.amountInvested), date: deposit.investmentDate }];

    const projectedValue = cashFlows.reduce(
      (sum, cf) =>
        sum +
        compoundedValue({
          principal: cf.amount,
          annualRatePercent: rate,
          fromDate: cf.date,
          toDate: now,
        }),
      0
    );

    if (Math.abs(projectedValue - toNumber(deposit.currentValue)) > 0.01) {
      await prisma.investment.update({
        where: { id: deposit.id },
        data: { currentValue: projectedValue },
      });
    }
  }
}
