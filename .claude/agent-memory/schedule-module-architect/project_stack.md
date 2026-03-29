---
name: Project Stack & Conventions
description: Full tech stack, folder conventions, and key project decisions for the Agenda app
type: project
---

**Stack:** Next.js 16.2.1 (App Router, Turbopack), TypeScript 5, Tailwind CSS v4, shadcn/ui using @base-ui/react internally, Prisma 7 with @prisma/adapter-mariadb, MySQL on AWS.

**Why:** Personal agenda + finance control app. Single-user, password-auth only (no NextAuth).

**Key paths:**
- API routes: `src/app/api/agenda/` (route.ts, [id]/route.ts, categorias/route.ts)
- Pages: `src/app/(app)/agenda/` (page.tsx, novo/page.tsx, [id]/page.tsx)
- Components: `src/components/agenda/` (event-form, event-card, event-list, filters-bar, calendar-view, month-view, week-view, day-view)
- Shared components: `src/components/shared/` (EmptyState, ListSkeleton, ConfirmDialog, StatsCard)
- DB singleton: `src/lib/prisma.ts` — import as `import { prisma } from "@/lib/prisma"`
- Prisma client: `src/generated/prisma/client`
- Types: `src/types/agenda.ts` (AgendaEvent, AgendaCategory, EventPriority, EventStatus)
- Validators: `src/lib/validators.ts` (createEventSchema, updateEventSchema, eventFiltersSchema)
- Constants: `src/lib/constants.ts` (EVENT_PRIORITY_LABELS, EVENT_STATUS_LABELS, REMINDER_OPTIONS, etc.)
- Utils: `src/lib/utils.ts` (cn, formatDate, formatDateLong, isOverdue, toDateString, etc.)

**Conventions:**
- API response format: `{ data: ... }` on success, `{ error: "..." }` on failure
- Route params in Next.js 16 are Promises — always `await context.params`
- searchParams in pages are also Promises — always `await searchParams`
- No index.ts re-exports — import directly from file path
- date-fns v4 installed (date-fns/locale for ptBR)
- toast via sonner (already in root layout as <Toaster />)

**How to apply:** Follow these paths and patterns for all future agenda module work.
