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
} from "@/components/ui/select";
import { EVENT_PRIORITY_LABELS, EVENT_STATUS_LABELS } from "@/lib/constants";
import { cn, toDateOnlyString } from "@/lib/utils";
import type { AgendaCategory } from "@/types/agenda";

export type PeriodOption = "today" | "week" | "month" | "custom" | "all";

export interface FiltersState {
  period: PeriodOption;
  dateFrom: string;
  dateTo: string;
  status: string;
  priority: string;
  categoryId: string;
  search: string;
}

interface FiltersBarProps {
  filters: FiltersState;
  onChange: (filters: FiltersState) => void;
}

const PERIOD_OPTIONS: { label: string; value: PeriodOption }[] = [
  { label: "Hoje", value: "today" },
  { label: "Esta semana", value: "week" },
  { label: "Este mes", value: "month" },
  { label: "Tudo", value: "all" },
  { label: "Personalizado", value: "custom" },
];

function getTodayStr(): string {
  return toDateOnlyString(new Date());
}

function getWeekRange(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    from: toDateOnlyString(mon),
    to: toDateOnlyString(sun),
  };
}

function getMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: toDateOnlyString(from), to: toDateOnlyString(to) };
}

export function computeDateRange(period: PeriodOption): {
  dateFrom: string;
  dateTo: string;
} {
  if (period === "today") {
    const t = getTodayStr();
    return { dateFrom: t, dateTo: t };
  }
  if (period === "week") {
    const { from, to } = getWeekRange();
    return { dateFrom: from, dateTo: to };
  }
  if (period === "month") {
    const { from, to } = getMonthRange();
    return { dateFrom: from, dateTo: to };
  }
  return { dateFrom: "", dateTo: "" };
}

export function FiltersBar({ filters, onChange }: FiltersBarProps) {
  const [categories, setCategories] = useState<AgendaCategory[]>([]);
  const selectedCategory = categories.find((cat) => cat.id === filters.categoryId);

  useEffect(() => {
    fetch("/api/agenda/categorias")
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
    const { dateFrom, dateTo } = computeDateRange(period);
    onChange({ ...filters, period, dateFrom, dateTo });
  }

  function hasActiveFilters(): boolean {
    return (
      filters.status !== "" ||
      filters.priority !== "" ||
      filters.categoryId !== "" ||
      filters.search !== ""
    );
  }

  function clearFilters() {
    const { dateFrom, dateTo } = computeDateRange(filters.period);
    onChange({
      period: filters.period,
      dateFrom,
      dateTo,
      status: "",
      priority: "",
      categoryId: "",
      search: "",
    });
  }

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
        {/* Busca */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar eventos..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Status */}
        <Select
          value={filters.status || "all"}
          onValueChange={(val) =>
            onChange({ ...filters, status: val === "all" ? "" : (val ?? "") })
          }
        >
          <SelectTrigger className="h-8 w-40 text-xs">
            <span
              data-slot="select-value"
              className={cn(
                "flex flex-1 text-left",
                !filters.status && "text-muted-foreground"
              )}
            >
              {filters.status
                ? EVENT_STATUS_LABELS[filters.status]
                : "Todos os status"}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Prioridade */}
        <Select
          value={filters.priority || "all"}
          onValueChange={(val) =>
            onChange({ ...filters, priority: val === "all" ? "" : (val ?? "") })
          }
        >
          <SelectTrigger className="h-8 w-40 text-xs">
            <span
              data-slot="select-value"
              className={cn(
                "flex flex-1 text-left",
                !filters.priority && "text-muted-foreground"
              )}
            >
              {filters.priority
                ? EVENT_PRIORITY_LABELS[filters.priority]
                : "Todas as prioridades"}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as prioridades</SelectItem>
            {Object.entries(EVENT_PRIORITY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Categoria */}
        {categories.length > 0 && (
          <Select
            value={filters.categoryId || "all"}
            onValueChange={(val) =>
              onChange({ ...filters, categoryId: val === "all" ? "" : (val ?? "") })
            }
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <span
                data-slot="select-value"
                className={cn(
                  "flex flex-1 items-center gap-2 text-left",
                  !selectedCategory && "text-muted-foreground"
                )}
              >
                {selectedCategory ? (
                  <>
                    <span
                      className="inline-block h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: selectedCategory.color }}
                    />
                    {selectedCategory.name}
                  </>
                ) : (
                  "Todas as categorias"
                )}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((cat) => (
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

        {/* Limpar filtros */}
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
