import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

export async function ensurePFAccount(userId: string, tx: Tx = prisma) {
  const existing = await tx.pFAccount.findUnique({ where: { userId } });
  if (existing) return existing;
  return tx.pFAccount.create({
    data: { userId, startingBalance: 0, currentBalance: 0 },
  });
}

export async function adjustPFBalance(userId: string, delta: number, tx: Tx = prisma) {
  const account = await ensurePFAccount(userId, tx);
  return tx.pFAccount.update({
    where: { userId },
    data: { currentBalance: Number(account.currentBalance) + delta },
  });
}
