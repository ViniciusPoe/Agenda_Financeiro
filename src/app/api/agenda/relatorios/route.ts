import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type StatusKey = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
type PriorityKey = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

const STATUS_ORDER: StatusKey[] = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

const PRIORITY_ORDER: PriorityKey[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const now = new Date();
    const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()), 10);
    const month = searchParams.get("month")
      ? parseInt(searchParams.get("month")!, 10)
      : null;

    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Ano invalido" }, { status: 400 });
    }

    if (month !== null && (isNaN(month) || month < 1 || month > 12)) {
      return NextResponse.json({ error: "Mes invalido" }, { status: 400 });
    }

    const summaryRange = buildDateRange(year, month);
    const monthPeriods = buildMonthPeriods(year, month);
    const seriesStart = new Date(monthPeriods[0].year, monthPeriods[0].month - 1, 1);
    const lastPeriod = monthPeriods[monthPeriods.length - 1];
    const seriesEnd = new Date(lastPeriod.year, lastPeriod.month, 0, 23, 59, 59, 999);

    const [periodEvents, seriesEvents] = await Promise.all([
      prisma.agendaEvent.findMany({
        where: {
          date: {
            gte: summaryRange.dateFrom,
            lte: summaryRange.dateTo,
          },
        },
        include: {
          category: true,
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      }),
      prisma.agendaEvent.findMany({
        where: {
          date: {
            gte: seriesStart,
            lte: seriesEnd,
          },
        },
        select: {
          date: true,
          status: true,
        },
      }),
    ]);

    const todayKey = toDateOnlyKey(new Date());

    const completedCount = periodEvents.filter((event) => event.status === "COMPLETED").length;

    const summary = {
      total: periodEvents.length,
      pending: periodEvents.filter((event) => event.status === "PENDING").length,
      inProgress: periodEvents.filter((event) => event.status === "IN_PROGRESS").length,
      completed: completedCount,
      cancelled: periodEvents.filter((event) => event.status === "CANCELLED").length,
      overdue: periodEvents.filter((event) => {
        const dateKey = toDateOnlyKey(event.date);
        return (
          dateKey < todayKey &&
          event.status !== "COMPLETED" &&
          event.status !== "CANCELLED"
        );
      }).length,
      allDay: periodEvents.filter((event) => event.allDay).length,
      completionRate:
        periodEvents.length > 0
          ? Number(((completedCount / periodEvents.length) * 100).toFixed(1))
          : 0,
    };

    const categoryMap = new Map<
      string,
      {
        categoryId: string | null;
        name: string;
        color: string;
        count: number;
        completedCount: number;
        overdueCount: number;
      }
    >();

    for (const event of periodEvents) {
      const key = event.categoryId ?? "none";
      if (!categoryMap.has(key)) {
        categoryMap.set(key, {
          categoryId: event.categoryId,
          name: event.category?.name ?? "Sem categoria",
          color: event.category?.color ?? "#6B7280",
          count: 0,
          completedCount: 0,
          overdueCount: 0,
        });
      }

      const item = categoryMap.get(key)!;
      item.count += 1;

      if (event.status === "COMPLETED") {
        item.completedCount += 1;
      }

      const dateKey = toDateOnlyKey(event.date);
      if (
        dateKey < todayKey &&
        event.status !== "COMPLETED" &&
        event.status !== "CANCELLED"
      ) {
        item.overdueCount += 1;
      }
    }

    const byCategory = Array.from(categoryMap.values()).sort((a, b) => b.count - a.count);

    const byStatus = STATUS_ORDER.map((status) => ({
      status,
      count: periodEvents.filter((event) => event.status === status).length,
    }));

    const byPriority = PRIORITY_ORDER.map((priority) => ({
      priority,
      count: periodEvents.filter((event) => event.priority === priority).length,
    }));

    const byWeekday = Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      label: WEEKDAY_LABELS[weekday],
      count: 0,
    }));

    for (const event of periodEvents) {
      const weekday = event.date.getUTCDay();
      byWeekday[weekday].count += 1;
    }

    const seriesMap = new Map(
      monthPeriods.map((period) => [
        `${period.year}-${String(period.month).padStart(2, "0")}`,
        {
          month: period.month,
          year: period.year,
          total: 0,
          completed: 0,
          cancelled: 0,
        },
      ])
    );

    for (const event of seriesEvents) {
      const key = `${event.date.getUTCFullYear()}-${String(event.date.getUTCMonth() + 1).padStart(2, "0")}`;
      const item = seriesMap.get(key);
      if (!item) continue;

      item.total += 1;
      if (event.status === "COMPLETED") item.completed += 1;
      if (event.status === "CANCELLED") item.cancelled += 1;
    }

    const byMonth = monthPeriods.map((period) => {
      const key = `${period.year}-${String(period.month).padStart(2, "0")}`;
      return seriesMap.get(key)!;
    });

    return NextResponse.json({
      data: {
        summary,
        byCategory,
        byStatus,
        byPriority,
        byWeekday,
        byMonth,
      },
    });
  } catch (error) {
    console.error("[GET /api/agenda/relatorios]", error);
    return NextResponse.json(
      { error: "Erro ao gerar relatorio" },
      { status: 500 }
    );
  }
}

function buildDateRange(year: number, month: number | null) {
  if (month !== null) {
    return {
      dateFrom: new Date(year, month - 1, 1),
      dateTo: new Date(year, month, 0, 23, 59, 59, 999),
    };
  }

  return {
    dateFrom: new Date(year, 0, 1),
    dateTo: new Date(year, 11, 31, 23, 59, 59, 999),
  };
}

function buildMonthPeriods(year: number, month: number | null) {
  if (month !== null) {
    const referenceDate = new Date(year, month - 1, 1);

    return Array.from({ length: 12 }, (_, index) => {
      const offset = 11 - index;
      const date = new Date(
        referenceDate.getFullYear(),
        referenceDate.getMonth() - offset,
        1
      );

      return {
        month: date.getMonth() + 1,
        year: date.getFullYear(),
      };
    });
  }

  return Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    year,
  }));
}

function toDateOnlyKey(date: Date) {
  const year = date.getUTCFullYear().toString().padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
