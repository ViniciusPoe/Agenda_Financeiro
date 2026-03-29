import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncAgendaStatuses } from "@/lib/agenda-automation";

export async function POST() {
  try {
    const result = await syncAgendaStatuses(prisma, new Date());

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[POST /api/agenda/sincronizar]", error);
    return NextResponse.json(
      { error: "Erro ao sincronizar status da agenda" },
      { status: 500 }
    );
  }
}
