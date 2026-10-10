"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { getMetalMarketData } from "@/lib/metalPrices";
import { compoundedValue } from "@/lib/finance";
import { toNumber } from "@/lib/utils";
import {
  investmentSchema,
  contributionSchema,
  currentValueSchema,
  quantityGramsSchema,
  interestRateSchema,
  type InvestmentInput,
  type ContributionInput,
} from "@/lib/validations/investment";

const METAL_TYPES = new Set(["GOLD", "SILVER"]);
const DEPOSIT_TYPES = new Set(["FIXED_DEPOSIT", "RECURRING_DEPOSIT"]);

export async function addInvestment(input: InvestmentInput) {
  const userId = await requireUserId();
  const data = investmentSchema.parse(input);
  const isMetal = METAL_TYPES.has(data.type) && data.quantityGrams;
  const isDeposit = DEPOSIT_TYPES.has(data.type) && data.interestRatePercent;

  let currentValue = data.currentValue;
  if (isMetal) {
    currentValue =
      (await getMetalMarketData())[data.type === "GOLD" ? "gold" : "silver"].pricePerGramINR *
      data.quantityGrams!;
  } else if (isDeposit) {
    currentValue = compoundedValue({
      principal: data.amountInvested,
      annualRatePercent: data.interestRatePercent!,
      fromDate: data.investmentDate,
    });
  }

  await prisma.$transaction(async (tx) => {
    const investment = await tx.investment.create({
      data: {
        userId,
        name: data.name,
        type: data.type,
        amountInvested: data.amountInvested,
        investmentDate: data.investmentDate,
        currentValue,
        quantityGrams: data.quantityGrams ?? null,
        interestRatePercent: data.interestRatePercent ?? null,
        notes: data.notes || null,
      },
    });

    if (data.amountInvested > 0) {
      await tx.investmentContribution.create({
        data: {
          investmentId: investment.id,
          amount: data.amountInvested,
          date: data.investmentDate,
        },
      });
    }
  });

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  revalidatePath("/net-worth");
}

export async function updateQuantityGrams(investmentId: string, input: { quantityGrams: number }) {
  const userId = await requireUserId();
  const { quantityGrams } = quantityGramsSchema.parse(input);

  const investment = await prisma.investment.findFirst({ where: { id: investmentId, userId } });
  if (!investment || !METAL_TYPES.has(investment.type)) {
    throw new Error("Not a metal holding");
  }

  const market = await getMetalMarketData();
  const pricePerGram = investment.type === "GOLD" ? market.gold.pricePerGramINR : market.silver.pricePerGramINR;

  await prisma.investment.update({
    where: { id: investmentId },
    data: { quantityGrams, currentValue: pricePerGram * quantityGrams },
  });

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  revalidatePath("/net-worth");
}

async function projectedDepositValue(investmentId: string, rate: number): Promise<number> {
  const contributions = await prisma.investmentContribution.findMany({ where: { investmentId } });
  return contributions.reduce(
    (sum, c) =>
      sum + compoundedValue({ principal: toNumber(c.amount), annualRatePercent: rate, fromDate: c.date }),
    0
  );
}

export async function addContribution(investmentId: string, input: ContributionInput) {
  const userId = await requireUserId();
  const data = contributionSchema.parse(input);

  await prisma.$transaction(async (tx) => {
    const investment = await tx.investment.findFirst({ where: { id: investmentId, userId } });
    if (!investment) throw new Error("Investment not found");

    await tx.investmentContribution.create({
      data: { investmentId, amount: data.amount, date: data.date },
    });

    await tx.investment.update({
      where: { id: investmentId },
      data: { amountInvested: Number(investment.amountInvested) + data.amount },
    });
  });

  const investment = await prisma.investment.findFirst({ where: { id: investmentId, userId } });
  if (investment && DEPOSIT_TYPES.has(investment.type) && investment.interestRatePercent) {
    const currentValue = await projectedDepositValue(investmentId, toNumber(investment.interestRatePercent));
    await prisma.investment.update({ where: { id: investmentId }, data: { currentValue } });
  }

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  revalidatePath("/net-worth");
}

export async function updateInterestRate(investmentId: string, input: { interestRatePercent: number }) {
  const userId = await requireUserId();
  const { interestRatePercent } = interestRateSchema.parse(input);

  const investment = await prisma.investment.findFirst({ where: { id: investmentId, userId } });
  if (!investment || !DEPOSIT_TYPES.has(investment.type)) {
    throw new Error("Not a fixed/recurring deposit");
  }

  const currentValue = await projectedDepositValue(investmentId, interestRatePercent);

  await prisma.investment.update({
    where: { id: investmentId },
    data: { interestRatePercent, currentValue },
  });

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  revalidatePath("/net-worth");
}

export async function updateCurrentValue(investmentId: string, input: { currentValue: number }) {
  const userId = await requireUserId();
  const { currentValue } = currentValueSchema.parse(input);

  await prisma.investment.updateMany({
    where: { id: investmentId, userId },
    data: { currentValue },
  });

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  revalidatePath("/net-worth");
}

export async function deleteInvestment(id: string) {
  const userId = await requireUserId();
  await prisma.investment.deleteMany({ where: { id, userId } });

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  revalidatePath("/net-worth");
}
