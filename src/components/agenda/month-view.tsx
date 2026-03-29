"use client";

import { useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/agenda/event-card";
import { cn, toDateOnlyString } from "@/lib/utils";
import type { AgendaEvent } from "@/types/agenda";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
const MAX_EVENTS_PER_DAY = 3;

interface MonthViewProps {
  currentDate: Date;
  events: AgendaEvent[];
  onNavigate: (date: Date) => void;
  onDayClick?: (date: Date) => void;
  onDeleted?: (id: string) => void;
  onStatusChanged?: (event: AgendaEvent) => void;
}

export function MonthView({
  currentDate,
  events,
  onNavigate,
  onDayClick,
  onDeleted,
  onStatusChanged,
}: MonthViewProps) {
  const today = new Date();
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const allDays = eachDayOfInterval({ start: calStart, end: calEnd });

  function prevMonth() {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    onNavigate(d);
  }

  function nextMonth() {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    onNavigate(d);
  }

  function goToday() {
    onNavigate(new Date());
  }

  // Group events by date key
  const eventsByDay = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    for (const event of events) {
      const key = toDateOnlyString(event.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    }
    return map;
  }, [events]);

  const monthLabel = format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon-sm" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon-sm" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold flex-1 capitalize">
          {monthLabel}
        </span>
        <Button variant="outline" size="sm" onClick={goToday}>
          Hoje
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border rounded-t-lg overflow-hidden">
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            className="py-2 text-center text-xs font-semibold text-muted-foreground border-r last:border-r-0 bg-muted/50"
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 border-l border-t rounded-b-lg overflow-hidden">
        {allDays.map((day) => {
          const key = toDateOnlyString(day);
          const dayEvents = eventsByDay.get(key) ?? [];
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isToday = isSameDay(day, today);
          const visibleEvents = dayEvents.slice(0, MAX_EVENTS_PER_DAY);
          const hiddenCount = dayEvents.length - MAX_EVENTS_PER_DAY;

          return (
            <div
              key={key}
              className={cn(
                "border-r border-b min-h-24 p-1 flex flex-col",
                !isCurrentMonth && "bg-muted/30",
                isToday && "bg-primary/5"
              )}
            >
              {/* Day number */}
              <button
                onClick={() => onDayClick?.(day)}
                className="self-end mb-1"
              >
                <span
                  className={cn(
                    "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted transition-colors",
                    isToday &&
                      "bg-primary text-primary-foreground hover:bg-primary",
                    !isCurrentMonth && "text-muted-foreground/60"
                  )}
                >
                  {format(day, "d")}
                </span>
              </button>

              {/* Events */}
              <div className="flex flex-col gap-0.5 flex-1">
                {visibleEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    compact
                    onDeleted={onDeleted}
                    onStatusChanged={onStatusChanged}
                  />
                ))}

                {hiddenCount > 0 && (
                  <button
                    onClick={() => onDayClick?.(day)}
                    className="text-xs text-muted-foreground hover:text-foreground px-1 py-0.5 rounded hover:bg-muted transition-colors text-left"
                  >
                    +{hiddenCount} mais
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-primary" />
          Hoje
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded bg-destructive/60" />
          Vencido
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded bg-green-500/60" />
          Concluido
        </span>
      </div>
    </div>
  );
}
