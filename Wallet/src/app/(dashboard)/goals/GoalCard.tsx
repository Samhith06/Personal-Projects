"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { goalProgressPercent, requiredMonthlyContribution } from "@/lib/finance";
import { deleteGoal } from "./actions";
import { GoalForm, type GoalFormValues } from "./GoalForm";

export function GoalCard({ goal }: { goal: GoalFormValues }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const progress = goalProgressPercent({
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
  });
  const required = requiredMonthlyContribution({
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    targetDate: new Date(goal.targetDate),
  });
  const complete = progress >= 100;
  const onTrack = complete || goal.monthlyContribution >= required;

  function onDelete() {
    if (!confirm(`Delete goal "${goal.name}"?`)) return;
    startTransition(async () => {
      await deleteGoal(goal.id);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-medium text-foreground">{goal.name}</h3>
            <p className="text-xs text-muted-2">
              Target {new Date(goal.targetDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          {complete ? (
            <Badge tone="positive">Complete</Badge>
          ) : onTrack ? (
            <Badge tone="positive">On track</Badge>
          ) : (
            <Badge tone="warning">Behind</Badge>
          )}
        </div>

        <div className="mt-4">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-foreground">
              {formatCurrency(goal.currentAmount)} <span className="text-muted-2">/ {formatCurrency(goal.targetAmount)}</span>
            </span>
            <span className="font-medium text-accent">{progress.toFixed(0)}%</span>
          </div>
          <ProgressBar percent={progress} className="mt-2" tone={complete ? "positive" : "accent"} />
        </div>

        {!complete ? (
          <p className="mt-3 text-xs text-muted">
            Needs <span className="font-medium text-foreground">{formatCurrency(required)}</span>/month to
            hit the target on time
            {goal.monthlyContribution > 0 ? (
              <> — you&apos;ve planned {formatCurrency(goal.monthlyContribution)}/month</>
            ) : null}
            .
          </p>
        ) : null}

        <div className="mt-4 flex items-center gap-3 border-t border-border-subtle pt-3">
          <GoalForm
            mode="edit"
            initial={goal}
            trigger={(open) => (
              <button onClick={open} className="text-xs font-medium text-muted hover:text-foreground">
                Update progress
              </button>
            )}
          />
          <button
            onClick={onDelete}
            disabled={pending}
            className="text-xs font-medium text-muted hover:text-negative disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
