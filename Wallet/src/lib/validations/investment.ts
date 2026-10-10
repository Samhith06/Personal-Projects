import { z } from "zod";
import { INVESTMENT_TYPES } from "@/lib/categories";

export const investmentSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  type: z.enum(INVESTMENT_TYPES),
  amountInvested: z.coerce.number().min(0),
  investmentDate: z.coerce.date(),
  currentValue: z.coerce.number().min(0),
  quantityGrams: z.coerce.number().positive().optional(),
  interestRatePercent: z.coerce.number().positive().max(50).optional(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const quantityGramsSchema = z.object({
  quantityGrams: z.coerce.number().positive("Quantity must be greater than 0"),
});

export const interestRateSchema = z.object({
  interestRatePercent: z.coerce
    .number()
    .positive("Interest rate must be greater than 0")
    .max(50, "That doesn't look like a valid annual rate"),
});

export const contributionSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  date: z.coerce.date(),
});

export const currentValueSchema = z.object({
  currentValue: z.coerce.number().min(0),
});

export type InvestmentInput = z.infer<typeof investmentSchema>;
export type ContributionInput = z.infer<typeof contributionSchema>;
