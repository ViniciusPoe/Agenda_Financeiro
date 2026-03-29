import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createEventSchema, eventFiltersSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawFilters = {
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      priority: searchParams.get("priority") ?? undefined,
      categoryId: searchParams.get("categoryId") ?? undefined,
      parentEventId: searchParams.get("parentEventId") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    };

    const parsed = eventFiltersSchema.safeParse(rawFilters);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Filtros invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const filters = parsed.data;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) {
        (where.date as Record<string, unknown>).gte = new Date(
          filters.dateFrom + "T00:00:00"
        );
      }
      if (filters.dateTo) {
        (where.date as Record<string, unknown>).lte = new Date(
          filters.dateTo + "T23:59:59"
        );
      }
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.parentEventId) {
      where.parentEventId = filters.parentEventId;
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    const events = await prisma.agendaEvent.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json({ data: events });
  } catch (error) {
    console.error("[GET /api/agenda]", error);
    return NextResponse.json(
      { error: "Erro ao buscar eventos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Validate end time is after start time
    if (data.startTime && data.endTime && data.endTime <= data.startTime) {
      return NextResponse.json(
        { error: "Hora de termino deve ser depois da hora de inicio" },
        { status: 400 }
      );
    }

    // Validate categoryId exists if provided
    if (data.categoryId) {
      const category = await prisma.agendaCategory.findUnique({
        where: { id: data.categoryId },
      });
      if (!category) {
        return NextResponse.json(
          { error: "Categoria nao encontrada" },
          { status: 400 }
        );
      }
    }

    const event = await prisma.agendaEvent.create({
      data: {
        title: data.title,
        description: data.description,
        date: new Date(data.date + "T00:00:00"),
        startTime: data.startTime,
        endTime: data.endTime,
        allDay: data.allDay ?? false,
        priority: data.priority ?? "MEDIUM",
        status: data.status ?? "PENDING",
        categoryId: data.categoryId,
        recurrenceRule: data.recurrenceRule,
        recurrenceEnd: data.recurrenceEnd
          ? new Date(data.recurrenceEnd + "T00:00:00")
          : undefined,
        reminderMinutes: data.reminderMinutes,
        isFreelancer: data.isFreelancer ?? false,
        freelanceAmount:
          data.freelanceAmount != null ? data.freelanceAmount : undefined,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json({ data: event }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/agenda]", error);
    return NextResponse.json(
      { error: "Erro ao criar evento" },
      { status: 500 }
    );
  }
}
