import { EventForm } from "@/components/agenda/event-form";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface NovoEventoPageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function NovoEventoPage({ searchParams }: NovoEventoPageProps) {
  const params = await searchParams;
  const defaultDate = params.date;

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
          <h1 className="text-xl font-bold tracking-tight">Novo evento</h1>
          <p className="text-sm text-muted-foreground">
            Preencha os dados do novo evento
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-xl border bg-card p-6">
        <EventForm defaultDate={defaultDate} />
      </div>
    </div>
  );
}
