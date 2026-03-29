"use client";

import dynamic from "next/dynamic";
import { getMonthName } from "@/lib/utils";

const BarChart = dynamic(() => import("recharts").then((module) => module.BarChart), {
  ssr: false,
});
const Bar = dynamic(() => import("recharts").then((module) => module.Bar), {
  ssr: false,
});
const XAxis = dynamic(() => import("recharts").then((module) => module.XAxis), {
  ssr: false,
});
const YAxis = dynamic(() => import("recharts").then((module) => module.YAxis), {
  ssr: false,
});
const CartesianGrid = dynamic(
  () => import("recharts").then((module) => module.CartesianGrid),
  { ssr: false }
);
const Tooltip = dynamic(() => import("recharts").then((module) => module.Tooltip), {
  ssr: false,
});
const Legend = dynamic(() => import("recharts").then((module) => module.Legend), {
  ssr: false,
});
const ResponsiveContainer = dynamic(
  () => import("recharts").then((module) => module.ResponsiveContainer),
  { ssr: false }
);

interface MonthData {
  month: number;
  year: number;
  total: number;
  completed: number;
  cancelled: number;
}

interface MonthlyEventsChartProps {
  data: MonthData[];
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
    <div className="space-y-1 rounded-lg border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map((item) => (
        <div key={item.name} className="flex items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-muted-foreground">{item.name}:</span>
          <span className="font-medium">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function MonthlyEventsChart({ data }: MonthlyEventsChartProps) {
  const chartData = data.map((item) => ({
    label: `${getMonthName(item.month).substring(0, 3)}/${String(item.year).slice(-2)}`,
    Eventos: item.total,
    Concluidos: item.completed,
    Cancelados: item.cancelled,
  }));

  const hasData = chartData.some(
    (item) => item.Eventos > 0 || item.Concluidos > 0 || item.Cancelados > 0
  );

  if (!hasData) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Nenhum dado disponivel
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} barGap={2} barCategoryGap="24%">
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
          allowDecimals={false}
          width={36}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
        <Bar dataKey="Eventos" fill="#2563eb" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Concluidos" fill="#16a34a" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Cancelados" fill="#64748b" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
