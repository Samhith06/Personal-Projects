"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { ensurePFAccount, adjustPFBalance } from "@/lib/pf";
import {
  salaryProfileSchema,
  incomeEntrySchema,
  type SalaryProfileInput,
  type IncomeEntryInput,
} from "@/lib/validations/income";

export async function saveSalaryProfile(input: SalaryProfileInput) {
  const userId = await requireUserId();
  const data = salaryProfileSchema.parse(input);

  await prisma.salaryProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });

  revalidatePath("/income");
  revalidatePath("/dashboard");
}

export async function addIncomeEntry(input: IncomeEntryInput) {
  const userId = await requireUserId();
  const data = incomeEntrySchema.parse(input);

  const netAmount =
    data.grossAmount -
    data.employeePF -
    data.incomeTax -
    data.professionalTax -
    data.otherDeductions;

  await prisma.$transaction(async (tx) => {
    const entry = await tx.incomeEntry.create({
      data: {
        userId,
        month: data.month,
        year: data.year,
        source: data.source,
        grossAmount: data.grossAmount,
        employeePF: data.employeePF,
        employerPF: data.employerPF,
        incomeTax: data.incomeTax,
        professionalTax: data.professionalTax,
        otherDeductions: data.otherDeductions,
        netAmount,
        date: data.date,
        notes: data.notes || null,
      },
    });

    if (data.employeePF > 0 || data.employerPF > 0) {
      await ensurePFAccount(userId, tx);
      await tx.pFContribution.create({
        data: {
          userId,
          month: data.month,
          year: data.year,
          employeeAmount: data.employeePF,
          employerAmount: data.employerPF,
          interestAmount: 0,
          date: data.date,
          incomeEntryId: entry.id,
        },
      });
      await adjustPFBalance(userId, data.employeePF + data.employerPF, tx);
    }
  });

  revalidatePath("/income");
  revalidatePath("/epf");
  revalidatePath("/dashboard");
}

export async function deleteIncomeEntry(id: string) {
  const userId = await requireUserId();

  await prisma.$transaction(async (tx) => {
    const entry = await tx.incomeEntry.findFirst({ where: { id, userId } });
    if (!entry) return;

    const linkedContribution = await tx.pFContribution.findFirst({
      where: { incomeEntryId: id, userId },
    });

    if (linkedContribution) {
      await adjustPFBalance(
        userId,
        -(Number(linkedContribution.employeeAmount) + Number(linkedContribution.employerAmount)),
        tx
      );
      await tx.pFContribution.delete({ where: { id: linkedContribution.id } });
    }

    await tx.incomeEntry.delete({ where: { id } });
  });

  revalidatePath("/income");
  revalidatePath("/epf");
  revalidatePath("/dashboard");
}

/** Generates this month's SALARY income entry from the saved recurring profile, if one doesn't already exist. */
export async function generateEntryFromProfile() {
  const userId = await requireUserId();

  const profile = await prisma.salaryProfile.findUnique({ where: { userId } });
  if (!profile) throw new Error("Save a salary profile first");

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const existing = await prisma.incomeEntry.findFirst({
    where: { userId, month, year, source: "SALARY" },
  });
  if (existing) throw new Error("This month's salary entry already exists");

  const gross = Number(profile.grossMonthly);
  const employeePF = (gross * Number(profile.employeePFPercent)) / 100;
  const employerPF = (gross * Number(profile.employerPFPercent)) / 100;
  const incomeTax = Number(profile.incomeTaxMonthly);
  const professionalTax = Number(profile.professionalTax);
  const otherDeductions = Number(profile.otherDeductions);
  const netAmount = gross - employeePF - incomeTax - professionalTax - otherDeductions;

  const date = new Date(year, month - 1, Math.min(profile.creditDay, 28));

  await prisma.$transaction(async (tx) => {
    const entry = await tx.incomeEntry.create({
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
        otherDeductions,
        netAmount,
        date,
      },
    });

    await ensurePFAccount(userId, tx);
    await tx.pFContribution.create({
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
    await adjustPFBalance(userId, employeePF + employerPF, tx);
  });

  revalidatePath("/income");
  revalidatePath("/epf");
  revalidatePath("/dashboard");
}
