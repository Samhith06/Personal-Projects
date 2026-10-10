"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

export function DualBarChart({
  data,
  aKey,
  bKey,
  aLabel,
  bLabel,
  aColor = "var(--positive)",
  bColor = "var(--negative)",
}: {
  data: Record<string, unknown>[];
  aKey: string;
  bKey: string;
  aLabel: string;
  bLabel: string;
  aColor?: string;
  bColor?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted">
        Not enough data yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border-subtle)" vertical={false} />
        <XAxis dataKey="label" stroke="var(--muted-2)" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis
          stroke="var(--muted-2)"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatCurrency(v)}
          width={80}
        />
        <Tooltip
          contentStyle={{
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 13,
          }}
          formatter={(value) => formatCurrency(Number(value ?? 0))}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted)" }} />
        <Bar dataKey={aKey} name={aLabel} fill={aColor} radius={[4, 4, 0, 0]} />
        <Bar dataKey={bKey} name={bLabel} fill={bColor} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
