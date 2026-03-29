import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCategorySchema } from "@/lib/validators";

function serializeCategory(c: Record<string, unknown>) {
  return {
    ...c,
    budgetAmount: c.budgetAmount != null ? String(c.budgetAmount) : null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const where: Record<string, unknown> = {};
    if (type === "INCOME" || type === "EXPENSE") {
      where.type = type;
    }

    const categories = await prisma.financeCategory.findMany({
      where,
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({
      data: categories.map((c) => serializeCategory(c as unknown as Record<string, unknown>)),
    });
  } catch (error) {
    console.error("[GET /api/financeiro/categorias]", error);
    return NextResponse.json(
      { error: "Erro ao buscar categorias" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createCategorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check for duplicate name within the same type
    const existing = await prisma.financeCategory.findFirst({
      where: {
        name: { equals: data.name },
        type: data.type,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ja existe uma categoria com esse nome para este tipo" },
        { status: 409 }
      );
    }

    const category = await prisma.financeCategory.create({
      data: {
        name: data.name,
        type: data.type,
        color: data.color,
        icon: data.icon,
        budgetAmount: data.budgetAmount,
      },
    });

    return NextResponse.json(
      { data: serializeCategory(category as unknown as Record<string, unknown>) },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/financeiro/categorias]", error);
    return NextResponse.json(
      { error: "Erro ao criar categoria" },
      { status: 500 }
    );
  }
}
