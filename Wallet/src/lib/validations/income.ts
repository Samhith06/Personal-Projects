import { z } from "zod";

export const salaryProfileSchema = z.object({
  grossMonthly: z.coerce.number().min(0),
  employeePFPercent: z.coerce.number().min(0).max(100),
  employerPFPercent: z.coerce.number().min(0).max(100),
  incomeTaxMonthly: z.coerce.number().min(0),
  professionalTax: z.coerce.number().min(0),
  otherDeductions: z.coerce.number().min(0),
  creditDay: z.coerce.number().int().min(1).max(31),
});

export const incomeEntrySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  source: z.enum(["SALARY", "BONUS", "FREELANCE", "BUSINESS", "OTHER"]),
  grossAmount: z.coerce.number().min(0),
  employeePF: z.coerce.number().min(0).default(0),
  employerPF: z.coerce.number().min(0).default(0),
  incomeTax: z.coerce.number().min(0).default(0),
  professionalTax: z.coerce.number().min(0).default(0),
  otherDeductions: z.coerce.number().min(0).default(0),
  date: z.coerce.date(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type SalaryProfileInput = z.infer<typeof salaryProfileSchema>;
export type IncomeEntryInput = z.infer<typeof incomeEntrySchema>;
