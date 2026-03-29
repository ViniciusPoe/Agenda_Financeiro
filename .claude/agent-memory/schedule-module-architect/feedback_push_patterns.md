---
name: Web Push & Shared DB Patterns
description: Key patterns learned implementing Web Push on a shared AWS MySQL DB — schema constraints, VAPID init, Uint8Array typing
type: feedback
---

Never use `@db.Text` with `@unique` in MySQL — Text columns cannot be indexed directly. Use `@db.VarChar(512)` for push subscription endpoints which is long enough for any browser push URL.

**Why:** MySQL requires a key length for index on TEXT columns. Prisma validate step catches this before migration.

**How to apply:** Whenever adding a `@unique` constraint on a string field that might need Text length, use VarChar with an explicit length instead.

---

Do not call `webpush.setVapidDetails()` at module load time in Next.js. It throws at build time when env vars are undefined.

**Why:** Next.js evaluates server module code during `next build` (static page data collection). VAPID env vars are not present in the build worker environment.

**How to apply:** Always wrap `webpush.setVapidDetails()` inside a lazy `initVapid()` function called at the start of `sendPushToAll()`.

---

The AWS MySQL database is shared with other applications (cotacoes, clientes, fornecedores, etc.). Never run `prisma db push` or `prisma migrate dev` without extreme caution — both can drop unmanaged tables.

**Why:** The DB has ~40 tables from other systems not in this Prisma schema. `db push` would DROP them. `migrate dev` attempts a reset when it detects drift.

**How to apply:** When adding tables, run raw SQL via `mysql2/promise` with `ssl: { rejectUnauthorized: false }`, then run `npm run db:generate` to regenerate the client.

---

`Uint8Array.from([...rawData].map(...))` produces `Uint8Array<ArrayBufferLike>` which TypeScript (strict) rejects for `applicationServerKey` in `PushManager.subscribe()`. Use explicit `ArrayBuffer` allocation instead:

```ts
function urlBase64ToUint8Array(s: string): Uint8Array<ArrayBuffer> {
  // ... base64 decode ...
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) view[i] = rawData.charCodeAt(i);
  return view;
}
```

**Why:** TypeScript strict mode distinguishes `Uint8Array<ArrayBuffer>` from `Uint8Array<ArrayBufferLike>` — the PushManager API requires the former.
