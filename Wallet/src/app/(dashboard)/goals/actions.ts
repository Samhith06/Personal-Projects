"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { goalSchema, type GoalInput } from "@/lib/validations/goal";

export async function addGoal(input: GoalInput) {
  const userId = await requireUserId();
  const data = goalSchema.parse(input);
  await prisma.goal.create({ data: { userId, ...data } });
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

export async function updateGoal(id: string, input: GoalInput) {
  const userId = await requireUserId();
  const data = goalSchema.parse(input);
  await prisma.goal.updateMany({ where: { id, userId }, data });
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

export async function deleteGoal(id: string) {
  const userId = await requireUserId();
  await prisma.goal.deleteMany({ where: { id, userId } });
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}
