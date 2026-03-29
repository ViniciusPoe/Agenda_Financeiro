import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAgendaCategorySchema } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const existing = await prisma.agendaCategory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Categoria nao encontrada" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = createAgendaCategorySchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const normalizedName = data.name?.trim();

    const updateData: Record<string, unknown> = {};
    if (normalizedName !== undefined) updateData.name = normalizedName;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.icon !== undefined) updateData.icon = data.icon || null;

    type TxResult =
      | { conflict: true }
      | { conflict: false; category: Awaited<ReturnType<typeof prisma.agendaCategory.update>> };

    const result = await prisma.$transaction<TxResult>(async (tx) => {
      if (normalizedName) {
        const duplicate = await tx.agendaCategory.findFirst({
          where: { name: { equals: normalizedName }, id: { not: id } },
        });
        if (duplicate) return { conflict: true };
      }
      const category = await tx.agendaCategory.update({ where: { id }, data: updateData });
      return { conflict: false, category };
    });

    if (result.conflict) {
      return NextResponse.json(
        { error: "Ja existe uma categoria com esse nome" },
        { status: 409 }
      );
    }

    return NextResponse.json({ data: result.category });
  } catch (error) {
    console.error("[PUT /api/agenda/categorias/[id]]", error);
    return NextResponse.json(
      { error: "Erro ao atualizar categoria" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const existing = await prisma.agendaCategory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Categoria nao encontrada" },
        { status: 404 }
      );
    }

    const eventCount = await prisma.agendaEvent.count({
      where: { categoryId: id },
    });

    await prisma.agendaCategory.delete({ where: { id } });

    return NextResponse.json({
      data: {
        success: true,
        eventCount,
      },
    });
  } catch (error) {
    console.error("[DELETE /api/agenda/categorias/[id]]", error);
    return NextResponse.json(
      { error: "Erro ao excluir categoria" },
      { status: 500 }
    );
  }
}
