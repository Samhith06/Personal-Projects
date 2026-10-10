import { cn } from "@/lib/utils";

export function ProgressBar({
  percent,
  className,
  tone = "accent",
}: {
  percent: number;
  className?: string;
  tone?: "accent" | "positive" | "warning" | "negative";
}) {
  const clamped = Math.min(100, Math.max(0, percent));
  const colors: Record<string, string> = {
    accent: "bg-accent",
    positive: "bg-positive",
    warning: "bg-warning",
    negative: "bg-negative",
  };
  return (
    <div className={cn("h-2 w-full rounded-full bg-surface-raised", className)}>
      <div
        className={cn("h-2 rounded-full transition-all", colors[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
