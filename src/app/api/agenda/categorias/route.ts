import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAgendaCategorySchema } from "@/lib/validators";

export async function GET() {
  try {
    const categories = await prisma.agendaCategory.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: categories });
  } catch (error) {
    console.error("[GET /api/agenda/categorias]", error);
    return NextResponse.json(
      { error: "Erro ao buscar categorias" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createAgendaCategorySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados invalidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const normalizedName = data.name.trim();

    const existing = await prisma.agendaCategory.findFirst({
      where: {
        name: { equals: normalizedName },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ja existe uma categoria com esse nome" },
        { status: 409 }
      );
    }

    const category = await prisma.agendaCategory.create({
      data: {
        name: normalizedName,
        color: data.color,
        icon: data.icon,
      },
    });

    return NextResponse.json({ data: category }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/agenda/categorias]", error);
    return NextResponse.json(
      { error: "Erro ao criar categoria" },
      { status: 500 }
    );
  }
}
