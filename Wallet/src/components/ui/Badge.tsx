import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Tone = "neutral" | "positive" | "negative" | "accent" | "warning";

const styles: Record<Tone, string> = {
  neutral: "bg-surface-raised text-muted border-border",
  positive: "bg-positive-soft text-positive border-transparent",
  negative: "bg-negative-soft text-negative border-transparent",
  accent: "bg-accent-soft text-accent border-transparent",
  warning: "bg-warning-soft text-warning border-transparent",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        styles[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
