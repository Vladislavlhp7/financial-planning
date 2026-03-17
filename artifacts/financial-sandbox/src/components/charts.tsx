import * as React from "react";
import {
  AreaChart as RechartsAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Legend,
  BarChart as RechartsBarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ReferenceLine,
  ReferenceDot,
  LineChart as RechartsLineChart,
  Line,
} from "recharts";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import type { ProjectedData, SummaryMetrics, BucketProjectedData, IncomeAllocation } from "@/lib/math";
import type { InvestmentBucket } from "@workspace/api-client-react";

const COLORS = {
  cash:         "hsl(160 84% 39%)",
  investments:  "hsl(230 84% 65%)",
  activeTrading:"hsl(38 92% 55%)",
  income:       "hsl(160 84% 39%)",
  expenses:     "hsl(348 83% 47%)",
  net:          "hsl(280 84% 55%)",
};

export function ProjectionAreaChart({
  data,
  fireNumber,
  goals,
}: {
  data: ProjectedData[];
  fireNumber?: number;
  goals?: { id: string; name: string; targetAmount: number; targetYear: number }[];
}) {
  const hasTrading = data.some((d) => d.activeTrading > 0);

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={COLORS.cash}         stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLORS.cash}         stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorInv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={COLORS.investments}  stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLORS.investments}  stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorTrading" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={COLORS.activeTrading} stopOpacity={0.35} />
              <stop offset="95%" stopColor={COLORS.activeTrading} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" vertical={false} />
          <XAxis
            dataKey="year"
            tickFormatter={(y) => `Yr ${y}`}
            stroke="hsl(0 0% 60%)"
            tick={{ fill: "hsl(0 0% 60%)", fontSize: 11 }}
            axisLine={false} tickLine={false} dy={10}
          />
          <YAxis
            tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
            stroke="hsl(0 0% 60%)"
            tick={{ fill: "hsl(0 0% 60%)", fontSize: 11 }}
            axisLine={false} tickLine={false} dx={-10}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(0 0% 7%)",
              borderColor: "hsl(0 0% 15%)",
              borderRadius: "12px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            }}
            itemStyle={{ fontWeight: 500 }}
            labelStyle={{ color: "hsl(0 0% 60%)", marginBottom: "4px" }}
            formatter={(val: number) => [formatCurrency(val, true), ""]}
            labelFormatter={(label) => `Projection at Year ${label}`}
          />
          <Area
            type="monotone"
            dataKey="investments"
            name="Investments"
            stackId="1"
            stroke={COLORS.investments}
            strokeWidth={2.5}
            fill="url(#colorInv)"
          />
          {hasTrading && (
            <Area
              type="monotone"
              dataKey="activeTrading"
              name="Active Trading"
              stackId="1"
              stroke={COLORS.activeTrading}
              strokeWidth={2.5}
              fill="url(#colorTrading)"
              strokeDasharray="5 3"
            />
          )}
          <Area
            type="monotone"
            dataKey="cash"
            name="Cash Savings"
            stackId="1"
            stroke={COLORS.cash}
            strokeWidth={2.5}
            fill="url(#colorCash)"
          />
          {fireNumber != null && fireNumber > 0 && (
            <ReferenceLine
              y={fireNumber}
              stroke="hsl(280 84% 55%)"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{ value: "FI Target", position: "right", fill: "hsl(280 84% 55%)" }}
            />
          )}
          {goals
            ?.filter((g) => g.targetAmount > 0 && g.targetYear > 0)
            .map((g, i) => (
              <ReferenceDot
                key={g.id}
                x={g.targetYear}
                y={g.targetAmount}
                r={6}
                fill={`hsl(${280 + i * 40} 70% 55%)`}
                stroke="hsl(0 0% 98%)"
                strokeWidth={2}
                label={{ value: g.name, position: "top", fill: "hsl(0 0% 60%)" }}
              />
            ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Monte Carlo Percentile Chart ────────────────────────────────────────────
export function MonteCarloChart({
  bands,
  isLoading,
}: {
  bands: { year: number; p10: number; p25: number; p50: number; p75: number; p90: number }[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="w-full h-[320px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Running simulations...</p>
      </div>
    );
  }
  if (!bands.length) return null;

  return (
    <div className="w-full h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={bands} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" vertical={false} />
          <XAxis
            dataKey="year"
            tickFormatter={(y) => `Yr ${y}`}
            stroke="hsl(0 0% 60%)"
            tick={{ fill: "hsl(0 0% 60%)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
            stroke="hsl(0 0% 60%)"
            tick={{ fill: "hsl(0 0% 60%)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(0 0% 7%)",
              borderColor: "hsl(0 0% 15%)",
              borderRadius: "12px",
            }}
            labelFormatter={(l) => `Year ${l}`}
            formatter={(val: number) => [formatCurrency(val, true), ""]}
          />
          <Line
            type="monotone"
            dataKey="p10"
            name="10th %ile"
            stroke="hsl(280 60% 55%)"
            strokeWidth={1}
            strokeOpacity={0.6}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="p25"
            name="25th %ile"
            stroke="hsl(280 65% 58%)"
            strokeWidth={1.5}
            strokeOpacity={0.8}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="p50"
            name="Median"
            stroke="hsl(280 70% 62%)"
            strokeWidth={3}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="p75"
            name="75th %ile"
            stroke="hsl(280 65% 58%)"
            strokeWidth={1.5}
            strokeOpacity={0.8}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="p90"
            name="90th %ile"
            stroke="hsl(280 60% 55%)"
            strokeWidth={1}
            strokeOpacity={0.6}
            dot={false}
          />
          <Legend verticalAlign="bottom" height={32} wrapperStyle={{ fontSize: "11px" }} />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Comparison Projection Chart ─────────────────────────────────────────────
export function ComparisonProjectionChart({
  leftData,
  rightData,
  leftLabel,
  rightLabel,
}: {
  leftData: ProjectedData[];
  rightData: ProjectedData[];
  leftLabel: string;
  rightLabel: string;
}) {
  const merged = React.useMemo(() => {
    const years = new Set<number>();
    leftData.forEach((d) => years.add(d.year));
    rightData.forEach((d) => years.add(d.year));
    return Array.from(years)
      .sort((a, b) => a - b)
      .map((year) => {
        const l = leftData.find((d) => d.year === year);
        const r = rightData.find((d) => d.year === year);
        return {
          year,
          left: l?.netWorth ?? 0,
          right: r?.netWorth ?? 0,
        };
      });
  }, [leftData, rightData]);

  return (
    <div className="w-full h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={merged} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" vertical={false} />
          <XAxis
            dataKey="year"
            tickFormatter={(y) => `Yr ${y}`}
            stroke="hsl(0 0% 60%)"
            tick={{ fill: "hsl(0 0% 60%)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
            stroke="hsl(0 0% 60%)"
            tick={{ fill: "hsl(0 0% 60%)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(0 0% 7%)",
              borderColor: "hsl(0 0% 15%)",
              borderRadius: "12px",
            }}
            labelFormatter={(l) => `Year ${l}`}
            formatter={(val: number) => [formatCurrency(val, true), ""]}
          />
          <Line
            type="monotone"
            dataKey="left"
            name={leftLabel}
            stroke="hsl(230 84% 65%)"
            strokeWidth={2.5}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="right"
            name={rightLabel}
            stroke="hsl(160 84% 39%)"
            strokeWidth={2.5}
            strokeDasharray="5 5"
            dot={false}
          />
          <Legend verticalAlign="bottom" height={32} wrapperStyle={{ fontSize: "11px" }} />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BreakdownDonutChart({
  summary,
  viewMode,
}: {
  summary: SummaryMetrics;
  viewMode: "monthly" | "yearly";
}) {
  const m = viewMode === "monthly";
  const data = [
    { name: "Expenses",      value: m ? summary.monthlyExpenses      : summary.annualExpenses,      color: COLORS.expenses },
    { name: "Investments",   value: m ? summary.monthlyInvestments   : summary.annualInvestments,   color: COLORS.investments },
    { name: "Active Trading",value: m ? summary.monthlyActiveTrading : summary.annualActiveTrading, color: COLORS.activeTrading },
    {
      name: "Net Cash",
      value: Math.max(0, m ? summary.monthlyNetCashFlow : summary.annualNetCashFlow),
      color: COLORS.net,
    },
  ].filter((d) => d.value > 0);

  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%" cy="50%"
            innerRadius={70} outerRadius={90}
            paddingAngle={5} dataKey="value"
            stroke="none" cornerRadius={8}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(val: number) => formatCurrency(val)}
            contentStyle={{
              backgroundColor: "hsl(0 0% 7%)",
              borderColor: "hsl(0 0% 15%)",
              borderRadius: "12px",
            }}
            itemStyle={{ color: "#fff" }}
          />
          <Legend verticalAlign="bottom" height={36} iconType="circle" />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Income Allocation Chart ─────────────────────────────────────────────────
export function IncomeAllocationChart({ allocation }: { allocation: IncomeAllocation[] }) {
  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="h-8 rounded-full overflow-hidden flex">
        {allocation.map((a, i) => (
          <div
            key={a.label}
            title={`${a.label}: ${a.pct.toFixed(1)}%`}
            style={{ width: `${a.pct}%`, backgroundColor: a.color }}
            className="h-full transition-all first:rounded-l-full last:rounded-r-full"
          />
        ))}
      </div>

      {/* Legend rows */}
      <div className="space-y-2">
        {allocation.map((a) => (
          <div key={a.label} className="flex items-center gap-3">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: a.color }}
            />
            <span className="text-xs text-muted-foreground flex-1">{a.label}</span>
            <span className="text-xs font-semibold text-foreground tabular-nums">
              {a.pct.toFixed(1)}%
            </span>
            <span className="text-xs text-muted-foreground tabular-nums w-20 text-right">
              {formatCurrency(a.value / 12)}/mo
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Bucket Growth Projection Chart ──────────────────────────────────────────
const BUCKET_HUES = [230, 280, 160, 25, 195, 340, 45];

export function BucketGrowthChart({
  data,
  buckets,
}: {
  data: BucketProjectedData[];
  buckets: InvestmentBucket[];
}) {
  if (!buckets.length || !data.length) return null;

  return (
    <div className="w-full h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <defs>
            {buckets.map((b, i) => {
              const hue = BUCKET_HUES[i % BUCKET_HUES.length];
              return (
                <linearGradient key={b.id} id={`bkt-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={`hsl(${hue} 70% 55%)`} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={`hsl(${hue} 70% 55%)`} stopOpacity={0} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" vertical={false} />
          <XAxis
            dataKey="year"
            tickFormatter={(y) => `Yr ${y}`}
            stroke="hsl(0 0% 60%)"
            tick={{ fill: "hsl(0 0% 60%)", fontSize: 11 }}
            axisLine={false} tickLine={false} dy={8}
          />
          <YAxis
            tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
            stroke="hsl(0 0% 60%)"
            tick={{ fill: "hsl(0 0% 60%)", fontSize: 11 }}
            axisLine={false} tickLine={false} dx={-8}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(0 0% 7%)",
              borderColor: "hsl(0 0% 15%)",
              borderRadius: "12px",
            }}
            itemStyle={{ fontWeight: 500 }}
            labelStyle={{ color: "hsl(0 0% 60%)", marginBottom: "4px" }}
            formatter={(val: number) => [formatCurrency(val, true), ""]}
            labelFormatter={(l) => `Year ${l}`}
          />
          {buckets.map((b, i) => {
            const hue = BUCKET_HUES[i % BUCKET_HUES.length];
            return (
              <Area
                key={b.id}
                type="monotone"
                dataKey={b.name}
                name={b.name}
                stackId="1"
                stroke={`hsl(${hue} 70% 55%)`}
                strokeWidth={2}
                fill={`url(#bkt-${i})`}
              />
            );
          })}
          <Legend
            verticalAlign="bottom"
            height={32}
            iconType="circle"
            wrapperStyle={{ fontSize: "11px" }}
          />
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Investment Efficiency Bar Chart ─────────────────────────────────────────
export function InvestmentRatioChart({
  summary,
  viewMode,
}: {
  summary: SummaryMetrics;
  viewMode: "monthly" | "yearly";
}) {
  const m = viewMode === "monthly";
  const income = m ? summary.monthlyIncome : summary.annualIncome;
  if (income <= 0) return null;

  const data = [
    {
      name: "Your Salary",
      Expenses: m ? summary.monthlyExpenses : summary.annualExpenses,
      "Passive Inv.": m ? summary.monthlyInvestments : summary.annualInvestments,
      "Active Trading": m ? summary.monthlyActiveTrading : summary.annualActiveTrading,
      "Free Cash": Math.max(0, m ? summary.monthlyNetCashFlow : summary.annualNetCashFlow),
    },
  ];

  const barColors: Record<string, string> = {
    "Expenses": COLORS.expenses,
    "Passive Inv.": COLORS.investments,
    "Active Trading": COLORS.activeTrading,
    "Free Cash": COLORS.cash,
  };

  const keys = ["Expenses", "Passive Inv.", "Active Trading", "Free Cash"] as const;

  return (
    <div className="w-full h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
          <XAxis
            type="number"
            tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
            stroke="hsl(0 0% 60%)"
            tick={{ fill: "hsl(0 0% 60%)", fontSize: 11 }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="hsl(0 0% 60%)"
            tick={{ fill: "hsl(0 0% 60%)", fontSize: 11 }}
            axisLine={false} tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(0 0% 7%)",
              borderColor: "hsl(0 0% 15%)",
              borderRadius: "12px",
            }}
            formatter={(val: number) => [formatCurrency(val), ""]}
          />
          <Legend
            verticalAlign="bottom"
            height={32}
            iconType="circle"
            wrapperStyle={{ fontSize: "11px" }}
          />
          {keys.map((k) => (
            <Bar key={k} dataKey={k} stackId="a" fill={barColors[k]} radius={k === "Free Cash" ? [0, 6, 6, 0] : [0, 0, 0, 0]} />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Bucket allocation mini-chart
export function BucketAllocationBar({
  buckets,
  useTarget,
}: {
  buckets: { name: string; currentAllocationPct: number; targetAllocationPct: number; returnRate: number }[];
  useTarget: boolean;
}) {
  const hues = [230, 160, 280, 25, 195, 340];

  return (
    <div className="space-y-2">
      {buckets.map((b, i) => {
        const pct = useTarget ? b.targetAllocationPct : b.currentAllocationPct;
        const hue = hues[i % hues.length];
        return (
          <div key={b.name}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground truncate mr-2">{b.name}</span>
              <span className="font-semibold shrink-0" style={{ color: `hsl(${hue} 70% 60%)` }}>
                {pct}% · {(b.returnRate * 100).toFixed(1)}%/yr
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: `hsl(${hue} 70% 55%)` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
