import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const now = new Date();
    const month = parseInt(
      searchParams.get("month") ?? String(now.getMonth() + 1),
      10
    );
    const year = parseInt(
      searchParams.get("year") ?? String(now.getFullYear()),
      10
    );

    if (isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Mes invalido" }, { status: 400 });
    }
    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Ano invalido" }, { status: 400 });
    }

    // Date range for the requested month
    const dateFrom = new Date(year, month - 1, 1);
    const dateTo = new Date(year, month, 0, 23, 59, 59);

    // All expense categories
    const categories = await prisma.financeCategory.findMany({
      where: { type: "EXPENSE" },
      orderBy: { name: "asc" },
    });

    // Aggregate spending per category for the month
    const spendingByCategory = await prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        type: "EXPENSE",
        date: { gte: dateFrom, lte: dateTo },
      },
      _sum: { amount: true },
    });

    const spentMap = new Map(
      spendingByCategory.map((row) => [
        row.categoryId,
        parseFloat(String(row._sum.amount ?? "0")),
      ])
    );

    const items = categories.map((cat) => {
      const spent = spentMap.get(cat.id) ?? 0;
      // budgetAmount is Decimal | null — serialise to string for JSON transport
      const budgetAmount =
        cat.budgetAmount != null ? parseFloat(String(cat.budgetAmount)) : null;
      const percentage =
        budgetAmount !== null && budgetAmount > 0
          ? Math.round((spent / budgetAmount) * 100)
          : null;

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        color: cat.color,
        icon: cat.icon,
        // Always string | null — never raw Decimal in JSON
        budgetAmount: budgetAmount !== null ? budgetAmount.toFixed(2) : null,
        spent: spent.toFixed(2),
        percentage,
      };
    });

    return NextResponse.json({ data: items });
  } catch (error) {
    console.error("[GET /api/financeiro/orcamento/categorias]", error);
    return NextResponse.json(
      { error: "Erro ao buscar orcamento por categoria" },
      { status: 500 }
    );
  }
}
