"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TRANSACTION_TYPE_LABELS } from "@/lib/constants";
import { cn, toDateOnlyString } from "@/lib/utils";
import type { FinanceCategory } from "@/types/financeiro";

export type PeriodOption = "month" | "week" | "all" | "custom";

export interface FinanceFiltersState {
  period: PeriodOption;
  dateFrom: string;
  dateTo: string;
  type: string;
  categoryId: string;
  paid: string;
  search: string;
}

interface FiltersBarProps {
  filters: FinanceFiltersState;
  onChange: (filters: FinanceFiltersState) => void;
}

const PERIOD_OPTIONS: { label: string; value: PeriodOption }[] = [
  { label: "Este mes", value: "month" },
  { label: "Esta semana", value: "week" },
  { label: "Tudo", value: "all" },
  { label: "Personalizado", value: "custom" },
];

function getMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: toDateOnlyString(from), to: toDateOnlyString(to) };
}

function getWeekRange(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    from: toDateOnlyString(mon),
    to: toDateOnlyString(sun),
  };
}

export function computeFinanceDateRange(period: PeriodOption): {
  dateFrom: string;
  dateTo: string;
} {
  if (period === "month") {
    const { from, to } = getMonthRange();
    return { dateFrom: from, dateTo: to };
  }
  if (period === "week") {
    const { from, to } = getWeekRange();
    return { dateFrom: from, dateTo: to };
  }
  return { dateFrom: "", dateTo: "" };
}

export function getInitialFinanceFilters(): FinanceFiltersState {
  const { dateFrom, dateTo } = computeFinanceDateRange("month");
  return {
    period: "month",
    dateFrom,
    dateTo,
    type: "",
    categoryId: "",
    paid: "",
    search: "",
  };
}

export function FinanceFiltersBar({ filters, onChange }: FiltersBarProps) {
  const [categories, setCategories] = useState<FinanceCategory[]>([]);

  useEffect(() => {
    fetch("/api/financeiro/categorias")
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setCategories(res.data);
      })
      .catch(() => {});
  }, []);

  function handlePeriodChange(period: PeriodOption) {
    if (period === "custom") {
      onChange({ ...filters, period });
      return;
    }
    const { dateFrom, dateTo } = computeFinanceDateRange(period);
    onChange({ ...filters, period, dateFrom, dateTo });
  }

  function hasActiveFilters(): boolean {
    return (
      filters.type !== "" ||
      filters.categoryId !== "" ||
      filters.paid !== "" ||
      filters.search !== ""
    );
  }

  function clearFilters() {
    const { dateFrom, dateTo } = computeFinanceDateRange(filters.period);
    onChange({
      period: filters.period,
      dateFrom,
      dateTo,
      type: "",
      categoryId: "",
      paid: "",
      search: "",
    });
  }

  // Split categories by type for the active type filter
  const filteredCategories =
    filters.type === "INCOME" || filters.type === "EXPENSE"
      ? categories.filter((c) => c.type === filters.type)
      : categories;

  return (
    <div className="space-y-3">
      {/* Period tabs */}
      <div className="flex flex-wrap gap-1">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handlePeriodChange(opt.value)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              filters.period === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      {filters.period === "custom" && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground whitespace-nowrap">
              De:
            </label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
              className="h-7 text-xs w-36"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground whitespace-nowrap">
              Ate:
            </label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
              className="h-7 text-xs w-36"
            />
          </div>
        </div>
      )}

      {/* Search + dropdowns */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar transacoes..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Tipo */}
        <Select
          value={filters.type || "all"}
          onValueChange={(val) =>
            onChange({ ...filters, type: val === "all" ? "" : (val ?? ""), categoryId: "" })
          }
        >
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue>
              {filters.type
                ? TRANSACTION_TYPE_LABELS[filters.type as keyof typeof TRANSACTION_TYPE_LABELS] ?? filters.type
                : "Todos os tipos"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Categoria */}
        {filteredCategories.length > 0 && (
          <Select
            value={filters.categoryId || "all"}
            onValueChange={(val) =>
              onChange({ ...filters, categoryId: val === "all" ? "" : (val ?? "") })
            }
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue>
                {filters.categoryId
                  ? (filteredCategories.find((c) => c.id === filters.categoryId)?.name ?? "Categoria")
                  : "Todas categorias"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {filteredCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Status de pagamento */}
        <Select
          value={filters.paid || "all"}
          onValueChange={(val) =>
            onChange({ ...filters, paid: val === "all" ? "" : (val ?? "") })
          }
        >
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue>
              {filters.paid === "true" ? "Pago" : filters.paid === "false" ? "Pendente" : "Todos"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="true">Pago</SelectItem>
            <SelectItem value="false">Pendente</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters() && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 text-xs text-muted-foreground"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
}
