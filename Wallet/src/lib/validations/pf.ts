import { z } from "zod";

export const pfContributionSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  employeeAmount: z.coerce.number().min(0).default(0),
  employerAmount: z.coerce.number().min(0).default(0),
  interestAmount: z.coerce.number().min(0).default(0),
  date: z.coerce.date(),
});

export const startingBalanceSchema = z.object({
  startingBalance: z.coerce.number().min(0),
});

export type PFContributionInput = z.infer<typeof pfContributionSchema>;
