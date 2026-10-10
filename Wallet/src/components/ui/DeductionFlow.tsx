import { formatCurrency } from "@/lib/utils";

export function DeductionFlow({
  gross,
  rows,
  net,
}: {
  gross: number;
  rows: { label: string; amount: number }[];
  net: number;
}) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-muted">Gross salary</span>
        <span className="font-medium text-foreground">{formatCurrency(gross)}</span>
      </div>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between pl-4">
          <span className="text-muted-2">− {row.label}</span>
          <span className="text-negative">{formatCurrency(row.amount)}</span>
        </div>
      ))}
      <div className="flex items-center justify-between border-t border-border-subtle pt-2">
        <span className="font-medium text-foreground">Net salary received</span>
        <span className="font-semibold text-positive">{formatCurrency(net)}</span>
      </div>
    </div>
  );
}
