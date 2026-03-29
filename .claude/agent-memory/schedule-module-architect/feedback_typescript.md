---
name: TypeScript Patterns for react-hook-form + Zod
description: Use z.input<> not z.infer<> for useForm generic when schema has .default() transforms
type: feedback
---

When Zod schemas use `.default()` (e.g., `z.boolean().optional().default(false)`), the inferred output type has `boolean` (not `boolean | undefined`) but the input type still allows `undefined`. react-hook-form's `Resolver` requires the input type.

**Rule:** For `useForm<T>` with zodResolver, use `z.input<typeof schema>` not `z.infer<typeof schema>` (which is `z.output<>`).

```tsx
import type { z } from "zod";
type FormValues = z.input<typeof createEventSchema>;
// then:
useForm<FormValues>({ resolver: zodResolver(createEventSchema) })
```

**Why:** Using `z.infer` (output type) causes TypeScript error because the resolver receives the input shape, not the transformed output shape. Got a build failure: "Type 'boolean | undefined' is not assignable to type 'boolean'".

**How to apply:** Always use `z.input<>` for the useForm generic type when the schema has default values or transforms.
