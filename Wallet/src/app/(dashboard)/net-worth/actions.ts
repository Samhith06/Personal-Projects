"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { assetSchema, liabilitySchema, type AssetInput, type LiabilityInput } from "@/lib/validations/networth";

export async function addAsset(input: AssetInput) {
  const userId = await requireUserId();
  const data = assetSchema.parse(input);
  await prisma.asset.create({ data: { userId, ...data } });
  revalidatePath("/net-worth");
  revalidatePath("/dashboard");
}

export async function updateAsset(id: string, input: AssetInput) {
  const userId = await requireUserId();
  const data = assetSchema.parse(input);
  await prisma.asset.updateMany({ where: { id, userId }, data });
  revalidatePath("/net-worth");
  revalidatePath("/dashboard");
}

export async function deleteAsset(id: string) {
  const userId = await requireUserId();
  await prisma.asset.deleteMany({ where: { id, userId } });
  revalidatePath("/net-worth");
  revalidatePath("/dashboard");
}

export async function addLiability(input: LiabilityInput) {
  const userId = await requireUserId();
  const data = liabilitySchema.parse(input);
  await prisma.liability.create({ data: { userId, ...data } });
  revalidatePath("/net-worth");
  revalidatePath("/dashboard");
}

export async function updateLiability(id: string, input: LiabilityInput) {
  const userId = await requireUserId();
  const data = liabilitySchema.parse(input);
  await prisma.liability.updateMany({ where: { id, userId }, data });
  revalidatePath("/net-worth");
  revalidatePath("/dashboard");
}

export async function deleteLiability(id: string) {
  const userId = await requireUserId();
  await prisma.liability.deleteMany({ where: { id, userId } });
  revalidatePath("/net-worth");
  revalidatePath("/dashboard");
}
