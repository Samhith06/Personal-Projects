"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { MetalAggregate, MetalPanelData } from "./metals";

function MetalCard({
  label,
  symbol,
  badgeColor,
  data,
}: {
  label: string;
  symbol: string;
  badgeColor: string;
  data: MetalAggregate;
}) {
  const up = data.changePercentToday >= 0;
  const sinceUp = data.sincePurchasePct >= 0;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-[#0a0a09]"
          style={{ background: badgeColor }}
        >
          {symbol}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-2">per 10g</p>
        </div>
      </div>

      <p className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
        {formatCurrency(data.pricePer10gINR)}
      </p>
      <p className={`mt-1 text-sm ${up ? "text-positive" : "text-negative"}`}>
        {up ? "↑" : "↓"} {formatPercent(Math.abs(data.changePercentToday))} today
      </p>

      {data.hasHolding ? (
        <div className="mt-4 space-y-2 border-t border-border-subtle pt-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted">Your holding</span>
            <span className="text-foreground">{data.holdingGrams.toFixed(1)}g</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Current value</span>
            <span className="font-semibold text-foreground">{formatCurrency(data.currentValue)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Since purchase</span>
            <span className={sinceUp ? "text-positive" : "text-negative"}>
              {sinceUp ? "↑" : "↓"} {formatPercent(Math.abs(data.sincePurchasePct))}
            </span>
          </div>
        </div>
      ) : (
        <p className="mt-4 border-t border-border-subtle pt-4 text-xs text-muted-2">
          You don&apos;t hold any {label.toLowerCase()} yet.
        </p>
      )}
    </div>
  );
}

export function MetalPricesPanel({
  data,
  updatedLabel,
}: {
  data: MetalPanelData;
  updatedLabel: string;
}) {
  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted">Live metal prices</h2>
        <span className="text-xs text-muted-2">Prices updated {updatedLabel}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <MetalCard label="Gold" symbol="Au" badgeColor="var(--gold)" data={data.gold} />
        <MetalCard label="Silver" symbol="Ag" badgeColor="#c0c0c0" data={data.silver} />
      </div>

      {data.history.length > 1 ? (
        <div className="mt-4 rounded-2xl border border-border bg-surface p-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-2">
            Gold vs Silver — 6 month trend (₹ per 10g)
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.history} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--muted-2)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                stroke="var(--muted-2)"
                fontSize={11}
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
                formatter={(value, name) => [formatCurrency(Number(value ?? 0)), name === "gold" ? "Gold" : "Silver"]}
              />
              <Line type="monotone" dataKey="gold" stroke="var(--accent)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="silver" stroke="var(--muted)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  );
}
