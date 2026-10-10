import { z } from "zod";

export const goalSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  targetAmount: z.coerce.number().positive("Target must be greater than 0"),
  currentAmount: z.coerce.number().min(0).default(0),
  targetDate: z.coerce.date(),
  monthlyContribution: z.coerce.number().min(0).default(0),
});

export type GoalInput = z.infer<typeof goalSchema>;
