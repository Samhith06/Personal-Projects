"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { expenseSchema, type ExpenseInput } from "@/lib/validations/expense";

export async function addExpense(input: ExpenseInput) {
  const userId = await requireUserId();
  const data = expenseSchema.parse(input);

  await prisma.expense.create({
    data: {
      userId,
      amount: data.amount,
      date: data.date,
      category: data.category,
      subcategory: data.subcategory || null,
      paymentMethod: data.paymentMethod,
      notes: data.notes || null,
      isRecurring: data.isRecurring,
    },
  });

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

export async function updateExpense(id: string, input: ExpenseInput) {
  const userId = await requireUserId();
  const data = expenseSchema.parse(input);

  await prisma.expense.updateMany({
    where: { id, userId },
    data: {
      amount: data.amount,
      date: data.date,
      category: data.category,
      subcategory: data.subcategory || null,
      paymentMethod: data.paymentMethod,
      notes: data.notes || null,
      isRecurring: data.isRecurring,
    },
  });

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

export async function deleteExpense(id: string) {
  const userId = await requireUserId();
  await prisma.expense.deleteMany({ where: { id, userId } });

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}
