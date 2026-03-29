---
name: Prisma Decimal serialization in server pages
description: Prisma Decimal fields must be converted to string with String() before assigning to AgendaEvent type in server components
type: feedback
---

When a server page (e.g., `src/app/(app)/agenda/[id]/page.tsx`) fetches from Prisma and spreads the result into the `AgendaEvent` TypeScript type, any `Decimal | null` fields returned by Prisma must be explicitly serialized to `string | null` using `String(value)`. The type `AgendaEvent` uses `string | null` for monetary fields (following the convention from `@/lib/utils` `decimalToNumber()`).

Example pattern:
```ts
freelanceAmount: event.freelanceAmount != null ? String(event.freelanceAmount) : null,
```

**Why:** TypeScript does not widen `Decimal` to `string` automatically, causing a type error at build time. The `Date` fields in the spread are OK because `AgendaEvent` already types them as `Date`.

**How to apply:** Any time a new `Decimal?` column is added to `AgendaEvent` in Prisma schema, also add explicit `String()` serialization in the edit page server component.
