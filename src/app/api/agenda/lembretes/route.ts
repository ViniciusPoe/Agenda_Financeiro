import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDueReminderAlerts } from "@/lib/agenda-automation";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minutesParam = searchParams.get("minutes");
    const minutes = minutesParam ? Number(minutesParam) : 30;

    if (isNaN(minutes) || minutes < 0 || minutes > 10080) {
      return NextResponse.json(
        { error: "Parametro minutes invalido (0-10080)" },
        { status: 400 }
      );
    }

    const alertEvents = await getDueReminderAlerts(prisma, minutes, new Date());

    return NextResponse.json({
      data: alertEvents,
      count: alertEvents.length,
    });
  } catch (error) {
    console.error("[GET /api/agenda/lembretes]", error);
    return NextResponse.json(
      { error: "Erro ao buscar lembretes" },
      { status: 500 }
    );
  }
}
