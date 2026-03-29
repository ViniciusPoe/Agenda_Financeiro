"use client";

import dynamic from "next/dynamic";
import { formatCurrency, getMonthName } from "@/lib/utils";

// Dynamic imports — SSR disabled for all Recharts
const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((m) => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const Legend = dynamic(() => import("recharts").then((m) => m.Legend), { ssr: false });
const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false }
);

interface MonthData {
  month: number;
  year: number;
  income: string;
  expense: string;
  balance: string;
}

interface IncomeVsExpenseProps {
  data: MonthData[];
  monthsToShow?: number;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border bg-card shadow-md px-3 py-2 text-xs space-y-1">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-muted-foreground">{item.name}:</span>
          <span className="font-medium">{formatCurrency(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function IncomeVsExpense({
  data,
  monthsToShow = 6,
}: IncomeVsExpenseProps) {
  const chartData = data.slice(-monthsToShow).map((d) => ({
    label: `${getMonthName(d.month).substring(0, 3)}/${String(d.year).slice(-2)}`,
    Receitas: parseFloat(d.income),
    Despesas: parseFloat(d.expense),
  }));

  const hasData = chartData.some((d) => d.Receitas > 0 || d.Despesas > 0);

  if (!hasData) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Nenhum dado disponivel
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} barGap={2} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(val) =>
            val >= 1000 ? `${(val / 1000).toFixed(0)}k` : String(val)
          }
          width={45}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconSize={10}
          iconType="circle"
          wrapperStyle={{ fontSize: "11px" }}
        />
        <Bar dataKey="Receitas" fill="#16a34a" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Despesas" fill="#dc2626" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
