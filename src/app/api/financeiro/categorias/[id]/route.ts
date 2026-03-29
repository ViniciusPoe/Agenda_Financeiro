import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCategorySchema } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string }> };

function serializeCategory(c: Record<string, unknown>) {
  return {
    ...c,
    budgetAmount: c.budgetAmount != null ? String(c.budgetAmount) : null,
  };
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const existing = await prisma.financeCategory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Categoria nao encontrada" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = createCategorySchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check for duplicate name within the same type (excluding current record)
    if (data.name) {
      const duplicate = await prisma.financeCategory.findFirst({
        where: {
          name: { equals: data.name },
          type: data.type ?? existing.type,
          id: { not: id },
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: "Ja existe uma categoria com esse nome para este tipo" },
          { status: 409 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.budgetAmount !== undefined) updateData.budgetAmount = data.budgetAmount ?? null;

    const category = await prisma.financeCategory.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      data: serializeCategory(category as unknown as Record<string, unknown>),
    });
  } catch (error) {
    console.error("[PUT /api/financeiro/categorias/[id]]", error);
    return NextResponse.json(
      { error: "Erro ao atualizar categoria" },
      { status: 500 }
    );
  }
}

// PATCH — update only budgetAmount (used by the budget screen inline editor)
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const existing = await prisma.financeCategory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Categoria nao encontrada" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Accept budgetAmount as positive number or null (to clear the limit)
    const patchSchema = {
      budgetAmount: (v: unknown) => {
        if (v === null || v === undefined) return { ok: true, value: null };
        const n = Number(v);
        if (isNaN(n) || n <= 0) return { ok: false };
        return { ok: true, value: n };
      },
    };

    if (!("budgetAmount" in body)) {
      return NextResponse.json(
        { error: "Campo budgetAmount e obrigatorio" },
        { status: 400 }
      );
    }

    const result = patchSchema.budgetAmount(body.budgetAmount);
    if (!result.ok) {
      return NextResponse.json(
        { error: "budgetAmount deve ser um numero positivo ou null" },
        { status: 400 }
      );
    }

    const category = await prisma.financeCategory.update({
      where: { id },
      data: { budgetAmount: result.value },
    });

    return NextResponse.json({
      data: serializeCategory(category as unknown as Record<string, unknown>),
    });
  } catch (error) {
    console.error("[PATCH /api/financeiro/categorias/[id]]", error);
    return NextResponse.json(
      { error: "Erro ao atualizar limite da categoria" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const existing = await prisma.financeCategory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Categoria nao encontrada" },
        { status: 404 }
      );
    }

    // Check if category is in use — FK constraint would prevent deletion
    const transactionCount = await prisma.transaction.count({
      where: { categoryId: id },
    });

    if (transactionCount > 0) {
      return NextResponse.json(
        {
          error: `Esta categoria possui ${transactionCount} transacao(oes) vinculada(s) e nao pode ser excluida.`,
          transactionCount,
        },
        { status: 409 }
      );
    }

    await prisma.financeCategory.delete({ where: { id } });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("[DELETE /api/financeiro/categorias/[id]]", error);
    return NextResponse.json(
      { error: "Erro ao excluir categoria" },
      { status: 500 }
    );
  }
}
