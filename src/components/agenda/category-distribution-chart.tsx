"use client";

import dynamic from "next/dynamic";

const PieChart = dynamic(() => import("recharts").then((module) => module.PieChart), {
  ssr: false,
});
const Pie = dynamic(() => import("recharts").then((module) => module.Pie), {
  ssr: false,
});
const Cell = dynamic(() => import("recharts").then((module) => module.Cell), {
  ssr: false,
});
const Tooltip = dynamic(() => import("recharts").then((module) => module.Tooltip), {
  ssr: false,
});
const ResponsiveContainer = dynamic(
  () => import("recharts").then((module) => module.ResponsiveContainer),
  { ssr: false }
);

interface CategoryData {
  categoryId: string | null;
  name: string;
  color: string;
  count: number;
  completedCount: number;
  overdueCount: number;
}

interface CategoryDistributionChartProps {
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
    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold">{item.name}</p>
      <p className="text-muted-foreground">{item.value} evento(s)</p>
      <p className="text-muted-foreground">
        {item.payload.completedCount} concluido(s)
      </p>
      {item.payload.overdueCount > 0 && (
        <p className="text-destructive">{item.payload.overdueCount} vencido(s)</p>
      )}
    </div>
  );
}

export function CategoryDistributionChart({
  data,
}: CategoryDistributionChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Nenhum evento no periodo
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="count"
            nameKey="name"
          >
            {data.map((item, index) => (
              <Cell key={`${item.categoryId ?? "none"}-${index}`} fill={item.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
        {data.map((item) => {
          const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : "0";

          return (
            <div
              key={item.categoryId ?? "none"}
              className="flex items-center justify-between text-xs"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate text-muted-foreground">{item.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-muted-foreground">{percentage}%</span>
                <span className="font-medium">{item.count}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between border-t pt-1 text-xs font-semibold">
        <span>Total de eventos</span>
        <span>{total}</span>
      </div>
    </div>
  );
}
