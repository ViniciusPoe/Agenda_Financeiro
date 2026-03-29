"use client";

import { useMemo } from "react";
import { format, isToday, isTomorrow, isYesterday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { EventCard } from "@/components/agenda/event-card";
import { EmptyState } from "@/components/shared/empty-state";
import { cn, toDateOnlyString } from "@/lib/utils";
import type { AgendaEvent } from "@/types/agenda";

interface EventListProps {
  events: AgendaEvent[];
  onDeleted?: (id: string) => void;
  onStatusChanged?: (event: AgendaEvent) => void;
}

function getDateLabel(dateStr: string): string {
  const normalizedDate = toDateOnlyString(dateStr);
  if (!normalizedDate) return "Data invalida";

  const date = parseISO(normalizedDate);

  if (isToday(date)) return "Hoje";
  if (isTomorrow(date)) return "Amanha";
  if (isYesterday(date)) return "Ontem";

  return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
}

function toDateKey(date: Date | string): string {
  return toDateOnlyString(date);
}

export function EventList({ events, onDeleted, onStatusChanged }: EventListProps) {
  // Group events by date
  const grouped = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    for (const event of events) {
      const key = toDateKey(event.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    }
    // Sort keys
    const sorted = Array.from(map.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    return sorted;
  }, [events]);

  if (events.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Nenhum evento encontrado"
        description="Tente ajustar os filtros ou crie um novo evento."
      />
    );
  }

  return (
    <div className="space-y-6">
      {grouped.map(([dateKey, dayEvents]) => (
        <div key={dateKey}>
          {/* Cabecalho do grupo de data */}
          <div className="flex items-center gap-3 mb-3">
            <h2
              className={cn(
                "text-sm font-semibold capitalize",
                dateKey === toDateOnlyString(new Date())
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              {getDateLabel(dateKey)}
            </h2>
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">
              {dayEvents.length} evento{dayEvents.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Eventos do dia */}
          <div className="space-y-2">
            {dayEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onDeleted={onDeleted}
                onStatusChanged={onStatusChanged}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
