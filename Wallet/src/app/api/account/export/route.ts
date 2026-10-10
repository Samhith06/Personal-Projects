import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function GET() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [
    user,
    salaryProfile,
    incomeEntries,
    pfAccount,
    pfContributions,
    expenses,
    investments,
    assets,
    liabilities,
    goals,
    netWorthSnapshots,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    }),
    prisma.salaryProfile.findUnique({ where: { userId } }),
    prisma.incomeEntry.findMany({ where: { userId } }),
    prisma.pFAccount.findUnique({ where: { userId } }),
    prisma.pFContribution.findMany({ where: { userId } }),
    prisma.expense.findMany({ where: { userId } }),
    prisma.investment.findMany({ where: { userId }, include: { contributions: true } }),
    prisma.asset.findMany({ where: { userId } }),
    prisma.liability.findMany({ where: { userId } }),
    prisma.goal.findMany({ where: { userId } }),
    prisma.netWorthSnapshot.findMany({ where: { userId } }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    user,
    salaryProfile,
    incomeEntries,
    pfAccount,
    pfContributions,
    expenses,
    investments,
    assets,
    liabilities,
    goals,
    netWorthSnapshots,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="wallet-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
