"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/utils";

export type DonutSlice = { label: string; value: number; color: string };

export function CategoryDonutChart({ data }: { data: DonutSlice[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted">
        No data to break down yet.
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-56 w-56 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="100%"
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((slice) => (
                <Cell key={slice.label} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 13,
              }}
              formatter={(value, name) => [formatCurrency(Number(value ?? 0)), String(name)]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {data
          .slice()
          .sort((a, b) => b.value - a.value)
          .map((slice) => (
            <div key={slice.label} className="flex items-center justify-between gap-2 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: slice.color }}
                />
                <span className="truncate text-muted">{slice.label}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-foreground">{formatCurrency(slice.value)}</span>
                <span className="w-10 text-right text-xs text-muted-2">
                  {total > 0 ? Math.round((slice.value / total) * 100) : 0}%
                </span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
