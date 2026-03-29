---
name: Agenda Module Architecture (Fases 3+4+8)
description: What was implemented in Fases 3, 4, and 8 — API routes, components, pages, recurrence
type: project
---

**Implemented 2026-03-28 — Fases 3, 4, and 8 complete.**

**Why:** Fases 3+4 are the core agenda CRUD and calendar views. Fase 8 adds recurrence (rrule) and reminder alert support.

## API Routes
- `GET/POST /api/agenda` — list with filters (dateFrom, dateTo, status, priority, categoryId, search) + create
- `GET/PUT/DELETE /api/agenda/[id]` — single event operations
- `GET/POST /api/agenda/categorias` — list + create agenda categories

## Components in src/components/agenda/
- `event-form.tsx` — unified create/edit form (react-hook-form + zod)
- `event-card.tsx` — card with priority border color, status badge, overdue indicator, quick actions
- `event-list.tsx` — grouped by date with date headers (Hoje/Amanha/Ontem/full date)
- `filters-bar.tsx` — period buttons (hoje/semana/mes/tudo/personalizado) + search + status/priority/category dropdowns
- `calendar-view.tsx` — tab wrapper switching between month/week/day views
- `month-view.tsx` — full month grid, compact event dots, click day to drill down
- `week-view.tsx` — 7-column timeline (Mon-Sun), timed events positioned, all-day row
- `day-view.tsx` — 24h timeline (6h-23h), current time indicator, all-day events at top

## Pages
- `/agenda` — main page with list/calendar toggle, overdue alert, filters
- `/agenda/novo` — event creation form (supports ?date= query param for pre-fill)
- `/agenda/[id]` — event detail/edit (server component, fetches from DB, passes to EventForm)

## Key design decisions
- Overdue detection: `date < today && status !== COMPLETED && status !== CANCELLED`
- Priority visual: left border color (slate/blue/orange/red) on EventCard
- Calendar fetches full month on view switch; list fetches with active filters
- Event colors use category.color for consistency across all views
- Timeline events: positioned with CSS top/height calculated from HH:MM parse

## Fase 8 — Recurrence (added 2026-03-28)
- `POST /api/agenda/recorrentes` — generates missing recurrence instances for a given month/year from a parent event. Body: `{ eventId, targetMonth (0-indexed), targetYear }`. Uses rrule to compute occurrences, creates only missing ones via `createMany`, returns all instances in the period.
- `GET /api/agenda/lembretes?minutes=30` — returns events whose reminder window falls within `now` to `now + minutes`. Filters by `reminderMinutes NOT NULL` + status PENDING/IN_PROGRESS + date within today/tomorrow.
- `src/hooks/use-recurrence.ts` — `generateRecurrenceDates`, `generateRecurrenceDatesForMonth`, `parseRRuleToLabel` (PT-BR text)
- `src/components/agenda/recurrence-selector.tsx` — dropdown for FREQ presets + optional end date input + live PT-BR label preview
- `event-form.tsx` — integrates RecurrenceSelector, hides it for recurrence instances, shows AlertDialog scope modal ("so este evento" | "este e todos futuros") on edit of instances

## Recurrence design decisions
- Instances are generated on-demand (not pre-generated). Consumer calls POST /recorrentes for a month before rendering.
- `parentEventId` identifies instances; parent has `recurrenceRule` + optionally `recurrenceEnd`.
- rrule returns UTC dates. `toDateKey` always uses `getUTCFullYear/Month/Date` for consistent YYYY-MM-DD keys.
- "Este e todos futuros" scope: truncates parent's `recurrenceEnd` to day before instance, deletes current instance, creates new parent from instance date onward.
- Prisma `createMany` is used for batch instance creation (no relations needed).
- `EventPriority` and `EventStatus` enums must be imported from `@/generated/prisma/enums` for Prisma `createMany` type safety.

**How to apply:** When adding features, follow this structure. New calendar views or list features extend existing components.
