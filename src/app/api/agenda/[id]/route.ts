import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateEventSchema } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const event = await prisma.agendaEvent.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Evento nao encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: event });
  } catch (error) {
    console.error("[GET /api/agenda/[id]]", error);
    return NextResponse.json(
      { error: "Erro ao buscar evento" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const existing = await prisma.agendaEvent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Evento nao encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Validate end time is after start time when both are present
    const effectiveAllDay = data.allDay ?? existing.allDay;
    const startTime =
      data.startTime !== undefined ? data.startTime : existing.startTime;
    const endTime =
      data.endTime !== undefined ? data.endTime : existing.endTime;
    if (!effectiveAllDay && startTime && endTime && endTime <= startTime) {
      return NextResponse.json(
        { error: "Hora de termino deve ser depois da hora de inicio" },
        { status: 400 }
      );
    }

    // Validate categoryId if provided
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

    // Build update payload
    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.date !== undefined)
      updateData.date = new Date(data.date + "T00:00:00");
    if (data.startTime !== undefined) updateData.startTime = data.startTime ?? null;
    if (data.endTime !== undefined) updateData.endTime = data.endTime ?? null;
    if (data.allDay !== undefined) updateData.allDay = data.allDay;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId ?? null;
    if (data.recurrenceRule !== undefined)
      updateData.recurrenceRule = data.recurrenceRule ?? null;
    if (data.recurrenceEnd !== undefined)
      updateData.recurrenceEnd = data.recurrenceEnd
        ? new Date(data.recurrenceEnd + "T00:00:00")
        : null;
    if (data.isFreelancer !== undefined)
      updateData.isFreelancer = data.isFreelancer;
    if (data.freelanceAmount !== undefined)
      updateData.freelanceAmount =
        data.freelanceAmount != null ? data.freelanceAmount : null;
    if (data.allDay === true) {
      updateData.startTime = null;
      updateData.endTime = null;
    }
    if (data.isFreelancer === false && data.freelanceAmount === undefined) {
      updateData.freelanceAmount = null;
    }

    // Handle completedAt when status changes to COMPLETED
    // The manual status is always respected — auto-sync will never override it
    if (data.status === "COMPLETED" && !existing.completedAt) {
      updateData.completedAt = new Date();
    } else if (
      data.status &&
      data.status !== "COMPLETED" &&
      existing.completedAt
    ) {
      // User manually uncompleted the event — clear completedAt so sync won't re-complete it
      updateData.completedAt = null;
    }
    if (data.completedAt !== undefined) {
      updateData.completedAt = data.completedAt ? new Date(data.completedAt) : null;
    }

    const event = await prisma.agendaEvent.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });

    return NextResponse.json({ data: event });
  } catch (error) {
    console.error("[PUT /api/agenda/[id]]", error);
    return NextResponse.json(
      { error: "Erro ao atualizar evento" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const existing = await prisma.agendaEvent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Evento nao encontrado" },
        { status: 404 }
      );
    }

    await prisma.agendaEvent.delete({ where: { id } });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("[DELETE /api/agenda/[id]]", error);
    return NextResponse.json(
      { error: "Erro ao excluir evento" },
      { status: 500 }
    );
  }
}
