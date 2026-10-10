import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

export async function computeAndSaveSnapshot(userId: string) {
  const [assets, liabilities, pfAccount, investments] = await Promise.all([
    prisma.asset.findMany({ where: { userId } }),
    prisma.liability.findMany({ where: { userId } }),
    prisma.pFAccount.findUnique({ where: { userId } }),
    prisma.investment.findMany({ where: { userId } }),
  ]);

  const totalAssets =
    assets.reduce((s, a) => s + toNumber(a.currentValue), 0) +
    toNumber(pfAccount?.currentBalance ?? 0) +
    investments.reduce((s, i) => s + toNumber(i.currentValue), 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + toNumber(l.currentValue), 0);
  const netWorth = totalAssets - totalLiabilities;

  const now = new Date();
  await prisma.netWorthSnapshot.upsert({
    where: {
      userId_year_month: { userId, year: now.getFullYear(), month: now.getMonth() + 1 },
    },
    create: {
      userId,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      totalAssets,
      totalLiabilities,
      netWorth,
    },
    update: { totalAssets, totalLiabilities, netWorth },
  });

  return { totalAssets, totalLiabilities, netWorth };
}
