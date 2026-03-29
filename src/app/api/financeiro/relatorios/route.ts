import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const now = new Date();
    const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()), 10);
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!, 10) : null;

    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Ano invalido" }, { status: 400 });
    }
    if (month !== null && (isNaN(month) || month < 1 || month > 12)) {
      return NextResponse.json({ error: "Mes invalido" }, { status: 400 });
    }

    // === Summary for the requested period ===
    let summaryWhere: Record<string, unknown>;
    if (month !== null) {
      const dateFrom = new Date(year, month - 1, 1);
      const dateTo = new Date(year, month, 0, 23, 59, 59);
      summaryWhere = { date: { gte: dateFrom, lte: dateTo } };
    } else {
      const dateFrom = new Date(year, 0, 1);
      const dateTo = new Date(year, 11, 31, 23, 59, 59);
      summaryWhere = { date: { gte: dateFrom, lte: dateTo } };
    }

    const [incomeAgg, expenseAgg] = await Promise.all([
      prisma.transaction.aggregate({
        where: { ...summaryWhere, type: "INCOME" },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: { ...summaryWhere, type: "EXPENSE" },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const totalIncome = parseFloat(String(incomeAgg._sum.amount ?? "0"));
    const totalExpense = parseFloat(String(expenseAgg._sum.amount ?? "0"));

    const summary = {
      totalIncome: totalIncome.toFixed(2),
      totalExpense: totalExpense.toFixed(2),
      balance: (totalIncome - totalExpense).toFixed(2),
      count: incomeAgg._count + expenseAgg._count,
    };

    // === By category (expenses only for the period) ===
    const expensesByCategory = await prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { ...summaryWhere, type: "EXPENSE" },
      _sum: { amount: true },
      _count: true,
    });

    // Fetch category details
    const categoryIds = expensesByCategory.map((e) => e.categoryId);
    const categories = categoryIds.length > 0
      ? await prisma.financeCategory.findMany({
          where: { id: { in: categoryIds } },
        })
      : [];

    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    const byCategory = expensesByCategory
      .map((e) => {
        const cat = categoryMap.get(e.categoryId);
        return {
          categoryId: e.categoryId,
          name: cat?.name ?? "Desconhecida",
          color: cat?.color ?? "#6B7280",
          total: parseFloat(String(e._sum.amount ?? "0")).toFixed(2),
          count: e._count,
        };
      })
      .sort((a, b) => parseFloat(b.total) - parseFloat(a.total));

    const monthPeriods = buildMonthPeriods(year, month);
    const periodStart = new Date(monthPeriods[0].year, monthPeriods[0].month - 1, 1);
    const lastPeriod = monthPeriods[monthPeriods.length - 1];
    const periodEnd = new Date(lastPeriod.year, lastPeriod.month, 0, 23, 59, 59);

    type MonthlyRow = { y: number; m: number; type: string; total: string };
    const monthlyRaw = await prisma.$queryRaw<MonthlyRow[]>`
      SELECT YEAR(date) AS y, MONTH(date) AS m, type, CAST(SUM(amount) AS CHAR) AS total
      FROM transactions
      WHERE date >= ${periodStart} AND date <= ${periodEnd}
      GROUP BY YEAR(date), MONTH(date), type
    `;

    const monthlyMap = new Map<string, MonthlyRow>();
    for (const row of monthlyRaw) {
      monthlyMap.set(`${Number(row.y)}-${Number(row.m)}-${row.type}`, row);
    }

    const byMonth = monthPeriods.map(({ month: periodMonth, year: periodYear }) => {
      const incomeRow = monthlyMap.get(`${periodYear}-${periodMonth}-INCOME`);
      const expenseRow = monthlyMap.get(`${periodYear}-${periodMonth}-EXPENSE`);
      const mIncomeVal = parseFloat(incomeRow?.total ?? "0");
      const mExpenseVal = parseFloat(expenseRow?.total ?? "0");
      return {
        month: periodMonth,
        year: periodYear,
        income: mIncomeVal.toFixed(2),
        expense: mExpenseVal.toFixed(2),
        balance: (mIncomeVal - mExpenseVal).toFixed(2),
      };
    });

    return NextResponse.json({
      data: {
        summary,
        byCategory,
        byMonth,
      },
    });
  } catch (error) {
    console.error("[GET /api/financeiro/relatorios]", error);
    return NextResponse.json(
      { error: "Erro ao gerar relatorio" },
      { status: 500 }
    );
  }
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
