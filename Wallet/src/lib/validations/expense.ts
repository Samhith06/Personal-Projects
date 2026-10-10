import { z } from "zod";
import { EXPENSE_CATEGORIES } from "@/lib/categories";

export const expenseSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  date: z.coerce.date(),
  category: z.enum(EXPENSE_CATEGORIES),
  subcategory: z.string().trim().max(100).optional().or(z.literal("")),
  paymentMethod: z.string().trim().min(1, "Payment method is required").max(50),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  isRecurring: z.boolean().default(false),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
