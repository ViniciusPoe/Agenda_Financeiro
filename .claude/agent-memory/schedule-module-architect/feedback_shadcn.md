---
name: shadcn/ui Incompatibilities with Tailwind v4
description: Critical rules for using shadcn components with base-ui under Tailwind v4
type: feedback
---

This project uses shadcn/ui built on @base-ui/react, NOT Radix UI. Several common patterns do NOT work.

**Rules:**

1. Never use `asChild` on any shadcn component — it does not exist in @base-ui/react.

2. For links styled as buttons, use `buttonVariants` from `@/lib/button-variants`:
   ```tsx
   import { buttonVariants } from "@/lib/button-variants";
   <Link href="/x" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
   ```

3. `Select.onValueChange` returns `string | null`, not `string`. Always handle null:
   ```tsx
   onValueChange={(val) => setValue("field", val ?? "")}
   ```

4. `DropdownMenuTrigger` does NOT support asChild. Apply button styles via className directly.

5. `Button` uses `@base-ui/react/button` — no asChild, no render prop except via ButtonPrimitive patterns.

**Why:** The project was set up with shadcn for Tailwind v4 which swapped Radix UI for @base-ui/react. The APIs are substantially different.

**How to apply:** Check every shadcn component usage — avoid asChild, handle null returns from value callbacks.
