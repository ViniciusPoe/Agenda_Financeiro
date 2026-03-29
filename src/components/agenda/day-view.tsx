"use client";

import { useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock } from "lucide-react";
import { EventCard } from "@/components/agenda/event-card";
import { cn, isOverdue, toDateOnlyString } from "@/lib/utils";
import type { AgendaEvent } from "@/types/agenda";

interface DayViewProps {
  date: Date;
  events: AgendaEvent[];
  onDeleted?: (id: string) => void;
  onStatusChanged?: (event: AgendaEvent) => void;
}

// Hours to display in timeline
const TIMELINE_START = 6;
const TIMELINE_END = 23;

function parseTime(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h + m / 60;
}

export function DayView({ date, events, onDeleted, onStatusChanged }: DayViewProps) {
  const dateStr = toDateOnlyString(date);
  const todayStr = toDateOnlyString(new Date());

  // Filter events for this specific day
  const dayEvents = useMemo(
    () =>
      events.filter(
        (e) => toDateOnlyString(e.date) === dateStr
      ),
    [events, dateStr]
  );

  // Split: all-day and timed events
  const allDayEvents = dayEvents.filter((e) => e.allDay || !e.startTime);
  const timedEvents = dayEvents.filter((e) => !e.allDay && !!e.startTime);

  // Sort timed events by start time
  const sortedTimedEvents = [...timedEvents].sort((a, b) =>
    (a.startTime ?? "").localeCompare(b.startTime ?? "")
  );

  const totalHours = TIMELINE_END - TIMELINE_START;
  const hourHeight = 60; // px per hour

  return (
    <div className="space-y-4">
      {/* Day header */}
      <div className="flex items-center gap-3">
        <div className="text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">
            {format(date, "EEE", { locale: ptBR })}
          </div>
          <div
            className={cn(
              "text-2xl font-bold w-10 h-10 flex items-center justify-center rounded-full",
              dateStr === todayStr
                ? "bg-primary text-primary-foreground"
                : "text-foreground"
            )}
          >
            {format(date, "d")}
          </div>
        </div>
        <div>
          <h2 className="font-semibold capitalize">
            {format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
          <p className="text-xs text-muted-foreground">
            {dayEvents.length} evento{dayEvents.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <span className="h-px flex-1 bg-border" />
            Dia inteiro / Sem horario
            <span className="h-px flex-1 bg-border" />
          </h3>
          {allDayEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onDeleted={onDeleted}
              onStatusChanged={onStatusChanged}
            />
          ))}
        </div>
      )}

      {/* Timeline */}
      <div className="relative overflow-x-hidden">
        <div
          className="relative border rounded-lg overflow-hidden"
          style={{ height: totalHours * hourHeight + 2 }}
        >
          {/* Hour grid lines */}
          {Array.from({ length: totalHours + 1 }).map((_, i) => {
            const hour = TIMELINE_START + i;
            return (
              <div
                key={hour}
                className="absolute left-0 right-0 flex items-start"
                style={{ top: i * hourHeight }}
              >
                <span className="w-12 text-right pr-2 text-xs text-muted-foreground select-none shrink-0 -mt-2">
                  {hour < 10 ? `0${hour}` : hour}:00
                </span>
                <div className="flex-1 border-t border-dashed border-border/60" />
              </div>
            );
          })}

          {/* Timed events */}
          {sortedTimedEvents.map((event) => {
            const startH = parseTime(event.startTime!);
            const endH = event.endTime ? parseTime(event.endTime) : startH + 1;
            const clampedStart = Math.max(startH, TIMELINE_START);
            const clampedEnd = Math.min(endH, TIMELINE_END);

            const top = (clampedStart - TIMELINE_START) * hourHeight;
            const height = Math.max(
              (clampedEnd - clampedStart) * hourHeight,
              28
            );

            const overdue = isOverdue(event.date, event.status);
            const isCompleted = event.status === "COMPLETED";

            return (
              <Link
                key={event.id}
                href={`/agenda/${event.id}`}
                className="absolute left-14 right-2 rounded overflow-hidden z-10 hover:z-20 transition-all hover:shadow-md"
                style={{ top, height }}
              >
                <div
                  className={cn(
                    "h-full w-full px-2 py-1 text-xs font-medium flex flex-col justify-start border-l-2",
                    isCompleted && "opacity-60",
                    overdue && !isCompleted && "border-l-destructive"
                  )}
                  style={{
                    backgroundColor: event.category?.color
                      ? event.category.color + "25"
                      : "#6366f125",
                    borderLeftColor: overdue && !isCompleted
                      ? undefined
                      : (event.category?.color ?? "#6366f1"),
                  }}
                >
                  <span
                    className={cn(
                      "truncate font-semibold",
                      isCompleted && "line-through"
                    )}
                  >
                    {event.title}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" />
                    {event.startTime}
                    {event.endTime && ` - ${event.endTime}`}
                  </span>
                </div>
              </Link>
            );
          })}

          {/* Current time indicator */}
          {dateStr === todayStr && (() => {
            const now = new Date();
            const currentH = now.getHours() + now.getMinutes() / 60;
            if (currentH < TIMELINE_START || currentH > TIMELINE_END)
              return null;
            const top = (currentH - TIMELINE_START) * hourHeight;
            return (
              <div
                className="absolute left-0 right-0 z-20 pointer-events-none"
                style={{ top }}
              >
                <div className="flex items-center">
                  <span className="w-12 text-right pr-1">
                    <span className="h-2 w-2 rounded-full bg-primary inline-block" />
                  </span>
                  <div className="flex-1 h-0.5 bg-primary" />
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Empty state */}
      {dayEvents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Clock className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">Nenhum evento neste dia</p>
          <p className="text-xs text-muted-foreground mt-1">
            Clique em &quot;Novo evento&quot; para adicionar
          </p>
        </div>
      )}
    </div>
  );
}
