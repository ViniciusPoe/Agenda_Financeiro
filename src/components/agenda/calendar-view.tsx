"use client";

import { useState } from "react";
import { MonthView } from "@/components/agenda/month-view";
import { WeekView } from "@/components/agenda/week-view";
import { DayView } from "@/components/agenda/day-view";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { AgendaEvent } from "@/types/agenda";

type CalendarViewType = "month" | "week" | "day";

interface CalendarViewProps {
  events: AgendaEvent[];
  initialView?: CalendarViewType;
  initialDate?: Date;
  onDeleted?: (id: string) => void;
  onStatusChanged?: (event: AgendaEvent) => void;
}

export function CalendarView({
  events,
  initialView = "month",
  initialDate,
  onDeleted,
  onStatusChanged,
}: CalendarViewProps) {
  const [view, setView] = useState<CalendarViewType>(initialView);
  const [currentDate, setCurrentDate] = useState<Date>(
    initialDate ?? new Date()
  );

  function handleDayClick(date: Date) {
    setCurrentDate(date);
    setView("day");
  }

  return (
    <div className="space-y-4">
      <Tabs
        value={view}
        onValueChange={(v) => setView(v as CalendarViewType)}
      >
        <TabsList>
          <TabsTrigger value="month">Mes</TabsTrigger>
          <TabsTrigger value="week">Semana</TabsTrigger>
          <TabsTrigger value="day">Dia</TabsTrigger>
        </TabsList>

        <TabsContent value="month">
          <MonthView
            currentDate={currentDate}
            events={events}
            onNavigate={setCurrentDate}
            onDayClick={handleDayClick}
            onDeleted={onDeleted}
            onStatusChanged={onStatusChanged}
          />
        </TabsContent>

        <TabsContent value="week">
          <WeekView
            currentDate={currentDate}
            events={events}
            onNavigate={setCurrentDate}
            onDayClick={handleDayClick}
          />
        </TabsContent>

        <TabsContent value="day">
          <DayView
            date={currentDate}
            events={events}
            onDeleted={onDeleted}
            onStatusChanged={onStatusChanged}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
