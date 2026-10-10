import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { GoalForm } from "./GoalForm";
import { GoalCard } from "./GoalCard";
import { toNumber } from "@/lib/utils";

export default async function GoalsPage() {
  const userId = await requireUserId();

  const goals = await prisma.goal.findMany({
    where: { userId },
    orderBy: { targetDate: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Financial Goals"
        description="Emergency funds, big purchases, retirement — track what you're saving toward."
        action={<GoalForm />}
      />

      {goals.length === 0 ? (
        <EmptyState
          title="No goals yet"
          description="Add a goal like an emergency fund or a house deposit to see how much you need to save each month."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => (
            <GoalCard
              key={g.id}
              goal={{
                id: g.id,
                name: g.name,
                targetAmount: toNumber(g.targetAmount),
                currentAmount: toNumber(g.currentAmount),
                targetDate: g.targetDate.toISOString(),
                monthlyContribution: toNumber(g.monthlyContribution),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
