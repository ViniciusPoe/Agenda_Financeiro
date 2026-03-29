import type { PrismaClient } from "../generated/prisma/client";

type AgendaStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

interface AgendaCategorySnapshot {
  id: string;
  name: string;
  color: string;
}

interface AgendaEventSnapshot {
  id: string;
  title: string;
  description: string | null;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  status: AgendaStatus;
  reminderMinutes: number | null;
  completedAt?: Date | null;
  category: AgendaCategorySnapshot | null;
}

export interface ReminderAlert {
  id: string;
  title: string;
  description: string | null;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  status: AgendaStatus;
  reminderMinutes: number;
  category: AgendaCategorySnapshot | null;
  eventDateTime: string;
  reminderAt: string;
  alertKey: string;
}

export interface AgendaStatusSyncResult {
  updated: number;
  inProgress: number;
  completed: number;
  updatedIds: string[];
}

export async function getDueReminderAlerts(
  db: PrismaClient,
  minutes = 30,
  now = new Date()
): Promise<ReminderAlert[]> {
  const windowEnd = new Date(now.getTime() + minutes * 60 * 1000);
  const dateStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);

  const events = (await db.agendaEvent.findMany({
    where: {
      reminderMinutes: { not: null },
      status: { in: ["PENDING", "IN_PROGRESS"] },
      date: {
        gte: dateStart,
        lte: dateEnd,
      },
    },
    include: { category: true },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  })) as unknown as AgendaEventSnapshot[];

  const toleranceStart = new Date(now.getTime() - 5 * 60 * 1000);

  return events
    .map((event) => {
      const reminderMinutes = event.reminderMinutes;
      if (reminderMinutes == null) return null;

      const eventDateTime = buildEventDateTime(event);
      const reminderTime = new Date(
        eventDateTime.getTime() - reminderMinutes * 60 * 1000
      );

      if (reminderTime > windowEnd || reminderTime < toleranceStart) {
        return null;
      }

      return {
        id: event.id,
        title: event.title,
        description: event.description,
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        allDay: event.allDay,
        status: event.status,
        reminderMinutes,
        category: event.category,
        eventDateTime: eventDateTime.toISOString(),
        reminderAt: reminderTime.toISOString(),
        alertKey: `${event.id}:${reminderTime.toISOString()}`,
      } satisfies ReminderAlert;
    })
    .filter((event): event is ReminderAlert => event !== null);
}

export async function syncAgendaStatuses(
  db: PrismaClient,
  now = new Date()
): Promise<AgendaStatusSyncResult> {
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const candidates = (await db.agendaEvent.findMany({
    where: {
      status: { in: ["PENDING", "IN_PROGRESS"] },
      date: {
        lte: todayEnd,
      },
    },
    select: {
      id: true,
      date: true,
      startTime: true,
      endTime: true,
      allDay: true,
      status: true,
      completedAt: true,
    },
  })) as Array<{
    id: string;
    date: Date;
    startTime: string | null;
    endTime: string | null;
    allDay: boolean;
    status: AgendaStatus;
    completedAt: Date | null;
  }>;

  let updated = 0;
  let inProgress = 0;
  const completed = 0;
  const updatedIds: string[] = [];

  for (const event of candidates) {
    const nextStatus = resolveAutomaticStatus(event, now);

    if (!nextStatus || nextStatus === event.status) {
      continue;
    }

    // Sync only sets IN_PROGRESS — COMPLETED is always set manually by the user
    await db.agendaEvent.update({
      where: { id: event.id },
      data: {
        status: nextStatus,
        // Preserve existing completedAt; never auto-set it here
        completedAt: event.completedAt ?? null,
      },
    });

    updated += 1;
    updatedIds.push(event.id);
    if (nextStatus === "IN_PROGRESS") inProgress += 1;
    // completed counter intentionally stays 0 — auto-complete is disabled
  }

  return {
    updated,
    inProgress,
    completed,
    updatedIds,
  };
}

export function buildEventDateTime(event: {
  date: Date;
  startTime: string | null;
  allDay?: boolean;
}): Date {
  const baseDate = new Date(event.date);

  if (event.startTime) {
    const [hours, minutes] = event.startTime.split(":").map(Number);

    return new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      hours,
      minutes,
      0,
      0
    );
  }

  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    8,
    0,
    0,
    0
  );
}

function resolveAutomaticStatus(
  event: {
    date: Date;
    startTime: string | null;
    endTime: string | null;
    allDay: boolean;
    status: AgendaStatus;
  },
  now: Date
): AgendaStatus | null {
  if (event.status === "CANCELLED" || event.status === "COMPLETED") {
    return null;
  }

  const eventDate = new Date(
    event.date.getFullYear(),
    event.date.getMonth(),
    event.date.getDate(),
    0,
    0,
    0,
    0
  );
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  if (event.allDay || !event.startTime) {
    // Auto-complete removida: apenas transiciona para IN_PROGRESS no dia do evento
    if (today.getTime() === eventDate.getTime()) {
      return "IN_PROGRESS";
    }

    return null;
  }

  const startDateTime = buildEventDateTime(event);

  // Auto-complete removida: apenas transiciona para IN_PROGRESS quando o evento comeca
  if (now >= startDateTime) {
    return "IN_PROGRESS";
  }

  return null;
}
