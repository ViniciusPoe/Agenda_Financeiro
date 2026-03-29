"use client";

import Link from "next/link";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, toDateOnlyString } from "@/lib/utils";
import type { AgendaEvent } from "@/types/agenda";

interface WeekViewProps {
  currentDate: Date;
  events: AgendaEvent[];
  onNavigate: (date: Date) => void;
  onDayClick?: (date: Date) => void;
}

const TIMELINE_START = 6;
const TIMELINE_END = 23;
const HOUR_HEIGHT = 48; // px per hour - more compact for week view

function parseTime(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h + m / 60;
}

export function WeekView({
  currentDate,
  events,
  onNavigate,
  onDayClick,
}: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const today = new Date();
  const totalHours = TIMELINE_END - TIMELINE_START;

  function prevWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    onNavigate(d);
  }

  function nextWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    onNavigate(d);
  }

  function goToday() {
    onNavigate(new Date());
  }

  const eventsByDay = new Map<string, AgendaEvent[]>();
  for (const day of days) {
    eventsByDay.set(toDateOnlyString(day), []);
  }
  for (const event of events) {
    const key = toDateOnlyString(event.date);
    if (eventsByDay.has(key)) {
      eventsByDay.get(key)!.push(event);
    }
  }

  const weekLabel = `${format(weekStart, "dd 'de' MMM", { locale: ptBR })} - ${format(weekEnd, "dd 'de' MMM 'de' yyyy", { locale: ptBR })}`;

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon-sm" onClick={prevWeek}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon-sm" onClick={nextWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium flex-1">{weekLabel}</span>
        <Button variant="outline" size="sm" onClick={goToday}>
          Hoje
        </Button>
      </div>

      {/* Week grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Day headers */}
          <div className="grid grid-cols-8 border-b">
            <div className="w-12" /> {/* Spacer for time column */}
            {days.map((day) => {
              const isToday = isSameDay(day, today);
              const dayKey = toDateOnlyString(day);
              const count = eventsByDay.get(dayKey)?.length ?? 0;
              return (
                <button
                  key={dayKey}
                  onClick={() => onDayClick?.(day)}
                  className={cn(
                    "flex flex-col items-center py-2 px-1 cursor-pointer hover:bg-muted/50 transition-colors border-l",
                    isToday && "bg-primary/5"
                  )}
                >
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    {format(day, "EEE", { locale: ptBR })}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full mt-0.5",
                      isToday && "bg-primary text-primary-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {count > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* All-day events row */}
          {(() => {
            const hasAllDay = days.some((day) => {
              const key = toDateOnlyString(day);
              return (eventsByDay.get(key) ?? []).some(
                (e) => e.allDay || !e.startTime
              );
            });
            if (!hasAllDay) return null;
            return (
              <div className="grid grid-cols-8 border-b bg-muted/20">
                <div className="w-12 text-right pr-2 py-1">
                  <span className="text-xs text-muted-foreground">
                    Sem hora
                  </span>
                </div>
                {days.map((day) => {
                  const key = toDateOnlyString(day);
                  const allDayEvts = (eventsByDay.get(key) ?? []).filter(
                    (e) => e.allDay || !e.startTime
                  );
                  return (
                    <div
                      key={key}
                      className="border-l p-1 space-y-0.5 min-h-8"
                    >
                      {allDayEvts.map((event) => (
                        <Link
                          key={event.id}
                          href={`/agenda/${event.id}`}
                          className="block"
                        >
                          <div
                            className="text-xs px-1.5 py-0.5 rounded truncate font-medium hover:opacity-80"
                            style={{
                              backgroundColor:
                                (event.category?.color ?? "#6366f1") + "30",
                              color: event.category?.color ?? "#6366f1",
                            }}
                          >
                            {event.title}
                          </div>
                        </Link>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Timeline */}
          <div
            className="relative grid grid-cols-8"
            style={{ height: totalHours * HOUR_HEIGHT }}
          >
            {/* Hour labels */}
            <div className="relative w-12">
              {Array.from({ length: totalHours + 1 }).map((_, i) => {
                const hour = TIMELINE_START + i;
                return (
                  <div
                    key={hour}
                    className="absolute right-0 text-right pr-2"
                    style={{ top: i * HOUR_HEIGHT - 8 }}
                  >
                    <span className="text-xs text-muted-foreground">
                      {hour < 10 ? `0${hour}` : hour}h
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Day columns */}
            {days.map((day) => {
              const key = toDateOnlyString(day);
              const timedEvts = (eventsByDay.get(key) ?? []).filter(
                (e) => !e.allDay && !!e.startTime
              );
              const isToday = isSameDay(day, today);

              return (
                <div
                  key={key}
                  className={cn(
                    "relative border-l",
                    isToday && "bg-primary/5"
                  )}
                >
                  {/* Hour grid lines */}
                  {Array.from({ length: totalHours + 1 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-t border-dashed border-border/40"
                      style={{ top: i * HOUR_HEIGHT }}
                    />
                  ))}

                  {/* Timed events */}
                  {timedEvts.map((event) => {
                    const startH = parseTime(event.startTime!);
                    const endH = event.endTime
                      ? parseTime(event.endTime)
                      : startH + 1;
                    const clampedStart = Math.max(startH, TIMELINE_START);
                    const clampedEnd = Math.min(endH, TIMELINE_END);
                    const top = (clampedStart - TIMELINE_START) * HOUR_HEIGHT;
                    const height = Math.max(
                      (clampedEnd - clampedStart) * HOUR_HEIGHT,
                      20
                    );

                    return (
                      <Link
                        key={event.id}
                        href={`/agenda/${event.id}`}
                        className="absolute left-0.5 right-0.5 rounded z-10 hover:z-20 overflow-hidden hover:shadow-sm transition-shadow"
                        style={{ top, height }}
                      >
                        <div
                          className="h-full px-1 py-0.5 text-xs font-medium border-l-2 flex flex-col"
                          style={{
                            backgroundColor:
                              (event.category?.color ?? "#6366f1") + "25",
                            borderLeftColor:
                              event.category?.color ?? "#6366f1",
                          }}
                        >
                          <span className="truncate leading-tight">
                            {event.title}
                          </span>
                          {height > 30 && (
                            <span className="text-muted-foreground leading-tight">
                              {event.startTime}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}

                  {/* Current time indicator */}
                  {isToday && (() => {
                    const now = new Date();
                    const currentH = now.getHours() + now.getMinutes() / 60;
                    if (currentH < TIMELINE_START || currentH > TIMELINE_END)
                      return null;
                    const top = (currentH - TIMELINE_START) * HOUR_HEIGHT;
                    return (
                      <div
                        className="absolute left-0 right-0 h-0.5 bg-primary z-20 pointer-events-none"
                        style={{ top }}
                      />
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
