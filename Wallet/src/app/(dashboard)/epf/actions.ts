"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { ensurePFAccount, adjustPFBalance } from "@/lib/pf";
import { pfContributionSchema, startingBalanceSchema, type PFContributionInput } from "@/lib/validations/pf";

export async function setStartingBalance(input: { startingBalance: number }) {
  const userId = await requireUserId();
  const { startingBalance } = startingBalanceSchema.parse(input);

  await prisma.$transaction(async (tx) => {
    await ensurePFAccount(userId, tx);
    const contributions = await tx.pFContribution.findMany({ where: { userId } });
    const totalContributions = contributions.reduce(
      (sum, c) => sum + Number(c.employeeAmount) + Number(c.employerAmount) + Number(c.interestAmount),
      0
    );
    await tx.pFAccount.update({
      where: { userId },
      data: {
        startingBalance,
        currentBalance: startingBalance + totalContributions,
      },
    });
  });

  revalidatePath("/epf");
  revalidatePath("/dashboard");
}

export async function addManualContribution(input: PFContributionInput) {
  const userId = await requireUserId();
  const data = pfContributionSchema.parse(input);

  await prisma.$transaction(async (tx) => {
    await ensurePFAccount(userId, tx);
    await tx.pFContribution.create({
      data: {
        userId,
        month: data.month,
        year: data.year,
        employeeAmount: data.employeeAmount,
        employerAmount: data.employerAmount,
        interestAmount: data.interestAmount,
        date: data.date,
      },
    });
    await adjustPFBalance(userId, data.employeeAmount + data.employerAmount + data.interestAmount, tx);
  });

  revalidatePath("/epf");
  revalidatePath("/dashboard");
}

export async function deleteManualContribution(id: string) {
  const userId = await requireUserId();

  await prisma.$transaction(async (tx) => {
    const contribution = await tx.pFContribution.findFirst({ where: { id, userId } });
    if (!contribution || contribution.incomeEntryId) return;

    await adjustPFBalance(
      userId,
      -(Number(contribution.employeeAmount) + Number(contribution.employerAmount) + Number(contribution.interestAmount)),
      tx
    );
    await tx.pFContribution.delete({ where: { id } });
  });

  revalidatePath("/epf");
  revalidatePath("/dashboard");
}
