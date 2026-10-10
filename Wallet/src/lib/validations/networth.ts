import { z } from "zod";
import { ASSET_CATEGORIES, LIABILITY_CATEGORIES } from "@/lib/categories";

export const assetSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  category: z.enum(ASSET_CATEGORIES),
  currentValue: z.coerce.number().min(0),
});

export const liabilitySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  category: z.enum(LIABILITY_CATEGORIES),
  currentValue: z.coerce.number().min(0),
  interestRate: z.coerce.number().min(0).max(100).default(0),
});

export type AssetInput = z.infer<typeof assetSchema>;
export type LiabilityInput = z.infer<typeof liabilitySchema>;
