"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, LayoutList, CalendarDays, Tags, BarChart3 } from "lucide-react";
import { FiltersBar, type FiltersState, computeDateRange } from "@/components/agenda/filters-bar";
import { EventList } from "@/components/agenda/event-list";
import { CalendarView } from "@/components/agenda/calendar-view";
import { ListSkeleton } from "@/components/shared/loading-skeleton";
import { buttonVariants } from "@/lib/button-variants";
import { cn, toDateOnlyString } from "@/lib/utils";
import type { AgendaEvent } from "@/types/agenda";

type MainView = "list" | "calendar";

function buildApiUrl(filters: FiltersState): string {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.search) params.set("search", filters.search);
  return `/api/agenda?${params.toString()}`;
}

function getInitialFilters(): FiltersState {
  const { dateFrom, dateTo } = computeDateRange("today");
  return {
    period: "today",
    dateFrom,
    dateTo,
    status: "",
    priority: "",
    categoryId: "",
    search: "",
  };
}

export default function AgendaPage() {
  const [view, setView] = useState<MainView>("list");
  const [filters, setFilters] = useState<FiltersState>(getInitialFilters);
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarFilters, setCalendarFilters] = useState<FiltersState>(() => {
    const { dateFrom, dateTo } = computeDateRange("month");
    return {
      period: "month",
      dateFrom,
      dateTo,
      status: "",
      priority: "",
      categoryId: "",
      search: "",
    };
  });

  const fetchEvents = useCallback(
    async (activeFilters: FiltersState) => {
      setLoading(true);
      try {
        const res = await fetch(buildApiUrl(activeFilters));
        const json = await res.json();
        if (json.data) setEvents(json.data);
      } catch {
        // keep existing events on error
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Fetch when filters change (list view)
  useEffect(() => {
    if (view === "list") {
      fetchEvents(filters);
    }
  }, [filters, view, fetchEvents]);

  // Fetch when calendar filters change (calendar view)
  useEffect(() => {
    if (view === "calendar") {
      fetchEvents(calendarFilters);
    }
  }, [calendarFilters, view, fetchEvents]);

  function handleSwitchToCalendar() {
    setView("calendar");
    // Calendar shows full month range — no date restriction
    const { dateFrom, dateTo } = computeDateRange("month");
    setCalendarFilters((prev) => ({ ...prev, period: "month", dateFrom, dateTo }));
  }

  function handleSwitchToList() {
    setView("list");
  }

  function handleDeleted(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  function handleStatusChanged(updated: AgendaEvent) {
    setEvents((prev) =>
      prev.map((e) => (e.id === updated.id ? updated : e))
    );
  }

  const overdueCount = events.filter(
    (e) => {
      const eventDate = toDateOnlyString(e.date);
      const today = toDateOnlyString(new Date());
      return (
        !!eventDate &&
        eventDate < today &&
        e.status !== "COMPLETED" &&
        e.status !== "CANCELLED"
      );
    }
  ).length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie seus eventos, tarefas e compromissos
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button
              onClick={handleSwitchToList}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                view === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <LayoutList className="h-3.5 w-3.5" />
              Lista
            </button>
            <button
              onClick={handleSwitchToCalendar}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                view === "calendar"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Calendario
            </button>
          </div>

          <Link
            href="/agenda/categorias"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Tags className="h-4 w-4" />
            Categorias
          </Link>

          <Link
            href="/agenda/relatorios"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <BarChart3 className="h-4 w-4" />
            Relatorios
          </Link>

          {/* New event button */}
          <Link
            href="/agenda/novo"
            className={cn(buttonVariants({ variant: "default", size: "sm" }))}
          >
            <Plus className="h-4 w-4" />
            Novo evento
          </Link>
        </div>
      </div>

      {/* Overdue alert */}
      {overdueCount > 0 && view === "list" && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-2.5 text-sm text-destructive">
          <span className="font-semibold">
            {overdueCount} evento{overdueCount !== 1 ? "s" : ""} vencido
            {overdueCount !== 1 ? "s" : ""}
          </span>
          <span className="text-destructive/70">- requer acao</span>
        </div>
      )}

      {/* List view */}
      {view === "list" && (
        <div className="space-y-4">
          <FiltersBar filters={filters} onChange={setFilters} />

          {loading ? (
            <ListSkeleton count={4} />
          ) : (
            <EventList
              events={events}
              onDeleted={handleDeleted}
              onStatusChanged={handleStatusChanged}
            />
          )}
        </div>
      )}

      {/* Calendar view */}
      {view === "calendar" && (
        <div>
          {loading && (
            <div className="text-xs text-muted-foreground text-center py-2">
              Carregando eventos...
            </div>
          )}
          <CalendarView
            events={events}
            initialDate={new Date()}
            onDeleted={handleDeleted}
            onStatusChanged={handleStatusChanged}
          />
        </div>
      )}
    </div>
  );
}
