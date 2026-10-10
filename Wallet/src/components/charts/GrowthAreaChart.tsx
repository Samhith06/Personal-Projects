"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

export function GrowthAreaChart({
  data,
  dataKey = "value",
  color = "var(--accent)",
  emptyMessage = "No data yet.",
  valueLabel = "Value",
}: {
  data: Record<string, unknown>[];
  dataKey?: string;
  color?: string;
  emptyMessage?: string;
  valueLabel?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted">
        {emptyMessage}
      </div>
    );
  }

  const gradientId = `fill-${dataKey}`;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
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
          formatter={(value) => [formatCurrency(Number(value ?? 0)), valueLabel]}
        />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
