import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

const DEMO_EMAIL = "demo@wallet.app";

async function main() {
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const passwordHash = await bcrypt.hash("Demo1234!", 12);
  const user = await prisma.user.create({
    data: { name: "Demo User", email: DEMO_EMAIL, passwordHash },
  });
  const userId = user.id;

  await prisma.salaryProfile.create({
    data: {
      userId,
      grossMonthly: 80000,
      employeePFPercent: 5,
      employerPFPercent: 5,
      incomeTaxMonthly: 3000,
      professionalTax: 200,
      otherDeductions: 0,
      creditDay: 1,
    },
  });

  await prisma.pFAccount.create({
    data: { userId, startingBalance: 150000, currentBalance: 150000 },
  });

  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const gross = 80000;
    const employeePF = 4000;
    const employerPF = 4000;
    const incomeTax = 3000;
    const professionalTax = 200;
    const netAmount = gross - employeePF - incomeTax - professionalTax;

    const entry = await prisma.incomeEntry.create({
      data: {
        userId,
        month,
        year,
        source: "SALARY",
        grossAmount: gross,
        employeePF,
        employerPF,
        incomeTax,
        professionalTax,
        otherDeductions: 0,
        netAmount,
        date,
      },
    });

    const contribution = await prisma.pFContribution.create({
      data: {
        userId,
        month,
        year,
        employeeAmount: employeePF,
        employerAmount: employerPF,
        interestAmount: 0,
        date,
        incomeEntryId: entry.id,
      },
    });

    await prisma.pFAccount.update({
      where: { userId },
      data: { currentBalance: { increment: employeePF + employerPF } },
    });
    void contribution;

    const expenseSeeds: { category: string; amount: number; subcategory?: string }[] = [
      { category: "RENT", amount: 15000 },
      { category: "FOOD", amount: 6000 + i * 300, subcategory: "Dining out" },
      { category: "GROCERIES", amount: 4500 },
      { category: "TRANSPORT", amount: 2500 },
      { category: "ENTERTAINMENT", amount: 2000 },
      { category: "BILLS", amount: 3000 },
      { category: "SHOPPING", amount: 2000 },
    ];
    for (const exp of expenseSeeds) {
      await prisma.expense.create({
        data: {
          userId,
          amount: exp.amount,
          date: new Date(year, month - 1, 10),
          category: exp.category as never,
          subcategory: exp.subcategory,
          paymentMethod: "UPI",
          isRecurring: exp.category === "RENT",
        },
      });
    }
  }

  const sip = await prisma.investment.create({
    data: {
      userId,
      name: "Nifty 50 Index Fund",
      type: "SIP",
      amountInvested: 60000,
      investmentDate: new Date(now.getFullYear() - 1, now.getMonth(), 1),
      currentValue: 71000,
    },
  });
  for (let i = 5; i >= 0; i--) {
    await prisma.investmentContribution.create({
      data: {
        investmentId: sip.id,
        amount: 10000,
        date: new Date(now.getFullYear(), now.getMonth() - i, 5),
      },
    });
  }

  await prisma.investment.create({
    data: {
      userId,
      name: "Gold ETF",
      type: "GOLD",
      amountInvested: 25000,
      investmentDate: new Date(now.getFullYear() - 1, now.getMonth(), 1),
      currentValue: 29500,
    },
  });

  await prisma.investment.create({
    data: {
      userId,
      name: "Fixed Deposit - HDFC",
      type: "FIXED_DEPOSIT",
      amountInvested: 100000,
      investmentDate: new Date(now.getFullYear() - 1, now.getMonth(), 1),
      currentValue: 107000,
    },
  });

  await prisma.asset.createMany({
    data: [
      { userId, name: "Cash on hand", category: "CASH", currentValue: 8000 },
      { userId, name: "HDFC Savings Account", category: "BANK", currentValue: 45000 },
    ],
  });

  await prisma.liability.create({
    data: {
      userId,
      name: "Credit card outstanding",
      category: "CREDIT_CARD",
      currentValue: 12000,
      interestRate: 3.5,
    },
  });

  await prisma.goal.createMany({
    data: [
      {
        userId,
        name: "Emergency fund",
        targetAmount: 200000,
        currentAmount: 120000,
        targetDate: new Date(now.getFullYear() + 1, now.getMonth(), 1),
        monthlyContribution: 7000,
      },
      {
        userId,
        name: "Goa trip",
        targetAmount: 60000,
        currentAmount: 15000,
        targetDate: new Date(now.getFullYear(), now.getMonth() + 4, 1),
        monthlyContribution: 5000,
      },
    ],
  });

  // Build a few months of net worth history so the timeline chart has data.
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const growthFactor = (6 - i) / 6;
    const totalAssets = 150000 + 186000 * growthFactor + 53000 * growthFactor;
    const totalLiabilities = 12000;
    await prisma.netWorthSnapshot.upsert({
      where: { userId_year_month: { userId, year: date.getFullYear(), month: date.getMonth() + 1 } },
      create: {
        userId,
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        totalAssets,
        totalLiabilities,
        netWorth: totalAssets - totalLiabilities,
      },
      update: {},
    });
  }

  console.log(`Seeded demo account: ${DEMO_EMAIL} / Demo1234!`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
