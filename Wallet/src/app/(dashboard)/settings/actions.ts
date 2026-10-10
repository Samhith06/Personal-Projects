"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { changePasswordSchema } from "@/lib/validations";

export async function changePassword(input: { currentPassword: string; newPassword: string }) {
  const userId = await requireUserId();
  const data = changePasswordSchema.parse(input);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  // Accounts created via Google sign-in have no password yet; let them set
  // one for the first time without requiring a "current password" match.
  if (user.passwordHash) {
    const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!valid) throw new Error("Current password is incorrect");
  }

  const passwordHash = await bcrypt.hash(data.newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

export async function deleteAccount() {
  const userId = await requireUserId();
  // Cascading deletes (schema onDelete: Cascade) remove all related
  // salary, income, PF, expense, investment, asset, liability, and goal data.
  await prisma.user.delete({ where: { id: userId } });
}
