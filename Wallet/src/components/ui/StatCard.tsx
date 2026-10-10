import { cn, formatCurrency } from "@/lib/utils";
import type { ReactNode } from "react";

type Tone = "neutral" | "positive" | "negative" | "accent" | "gold";

const toneStyles: Record<Tone, { text: string; soft: string }> = {
  neutral: { text: "text-foreground", soft: "bg-surface-raised" },
  positive: { text: "text-positive", soft: "bg-positive-soft" },
  negative: { text: "text-negative", soft: "bg-negative-soft" },
  accent: { text: "text-accent", soft: "bg-accent-soft" },
  gold: { text: "text-gold", soft: "bg-warning-soft" },
};

export function StatCard({
  label,
  value,
  currency = true,
  precise = false,
  tone = "neutral",
  sub,
  icon,
}: {
  label: string;
  value: number | string;
  currency?: boolean;
  precise?: boolean;
  tone?: Tone;
  sub?: ReactNode;
  icon?: ReactNode;
}) {
  const styles = toneStyles[tone];
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-2">
          {label}
        </p>
        {icon ? (
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              styles.soft
            )}
          >
            {icon}
          </div>
        ) : null}
      </div>
      <p className={cn("mt-3 text-2xl font-semibold tracking-tight", styles.text)}>
        {currency ? formatCurrency(value, precise) : value}
      </p>
      {sub ? <div className="mt-1.5 text-xs text-muted">{sub}</div> : null}
    </div>
  );
}
