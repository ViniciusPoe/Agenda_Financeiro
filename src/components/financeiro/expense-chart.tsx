"use client";

import dynamic from "next/dynamic";
import { formatCurrency } from "@/lib/utils";

// Dynamic imports — all Recharts components must be SSR-disabled
const PieChart = dynamic(() => import("recharts").then((m) => m.PieChart), { ssr: false });
const Pie = dynamic(() => import("recharts").then((m) => m.Pie), { ssr: false });
const Cell = dynamic(() => import("recharts").then((m) => m.Cell), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false }
);

interface CategoryData {
  categoryId: string;
  name: string;
  color: string;
  total: string;
  count: number;
}

interface ExpenseChartProps {
  data: CategoryData[];
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: CategoryData }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border bg-card shadow-md px-3 py-2 text-xs">
      <p className="font-semibold mb-1">{item.name}</p>
      <p className="text-muted-foreground">{formatCurrency(item.value)}</p>
      <p className="text-muted-foreground">{item.payload.count} transacao(oes)</p>
    </div>
  );
}

export function ExpenseChart({ data }: ExpenseChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Nenhuma despesa no periodo
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    value: parseFloat(d.total),
  }));

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend manual para melhor controle */}
      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
        {chartData.map((item) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";
          return (
            <div key={item.categoryId} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate text-muted-foreground">{item.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-muted-foreground">{pct}%</span>
                <span className="font-medium">{formatCurrency(item.value)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-1 border-t flex justify-between text-xs font-semibold">
        <span>Total despesas</span>
        <span className="text-red-600">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
