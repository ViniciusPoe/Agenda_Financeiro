# Agent Memory — Schedule Module Architect

- [Project Stack & Conventions](project_stack.md) — Next.js 16.2, Tailwind v4, shadcn base-ui, Prisma 7, MySQL/MariaDB
- [shadcn Incompatibilities](feedback_shadcn.md) — No asChild, Select.onValueChange returns string|null, buttonVariants for Link
- [Module Architecture](project_module_arch.md) — API routes, components, pages implemented in Fases 3+4+8 (incl. recurrence)
- [TypeScript Patterns](feedback_typescript.md) — Use z.input<typeof schema> for useForm, not inferred output type
- [Web Push & Shared DB Patterns](feedback_push_patterns.md) — VarChar(512) for unique endpoint, lazy VAPID init, Uint8Array<ArrayBuffer>, raw SQL for shared DB
- [Prisma Decimal Serialization](feedback_serialization.md) — Decimal fields need String() in server pages before assigning to AgendaEvent type
- [Auto-status sync policy](feedback_auto_status.md) — syncAgendaStatuses only sets IN_PROGRESS, never COMPLETED (manual-only)
