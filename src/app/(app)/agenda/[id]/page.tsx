import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { EventForm } from "@/components/agenda/event-form";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";
import type { AgendaEvent } from "@/types/agenda";

interface EditEventoPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEventoPage({ params }: EditEventoPageProps) {
  const { id } = await params;

  const event = await prisma.agendaEvent.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!event) {
    notFound();
  }

  // Serialize for client component — dates must be plain values, Decimal → string
  const serialized: AgendaEvent = {
    ...event,
    date: event.date,
    recurrenceEnd: event.recurrenceEnd,
    completedAt: event.completedAt,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    freelanceAmount:
      event.freelanceAmount != null ? String(event.freelanceAmount) : null,
    category: event.category
      ? {
          ...event.category,
          createdAt: event.category.createdAt,
        }
      : null,
    priority: event.priority as AgendaEvent["priority"],
    status: event.status as AgendaEvent["status"],
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/agenda"
          className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Editar evento</h1>
          <p className="text-sm text-muted-foreground line-clamp-1">
            {event.title}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-xl border bg-card p-6">
        <EventForm event={serialized} />
      </div>
    </div>
  );
}
