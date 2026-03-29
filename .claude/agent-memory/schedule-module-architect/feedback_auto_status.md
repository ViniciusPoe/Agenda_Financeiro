---
name: Auto-status sync policy — no auto-complete
description: syncAgendaStatuses only auto-sets IN_PROGRESS, never COMPLETED. COMPLETED is always set manually.
type: feedback
---

The automation in `src/lib/agenda-automation.ts` (`syncAgendaStatuses` + `resolveAutomaticStatus`) must NEVER auto-transition events to COMPLETED. The COMPLETED state is reserved for explicit user action only.

- `resolveAutomaticStatus`: only returns `"IN_PROGRESS"` or `null`. The branch that previously returned `"COMPLETED"` was removed.
- `syncAgendaStatuses`: the DB update preserves existing `completedAt` and does not set it. The `completed` counter in the result will always be 0.

**Why:** Auto-completing events was causing confusion — users would find events completed without their action, and manually unmarking as complete would be re-completed by the next sync run.

**How to apply:** If any future feature needs to auto-complete events (e.g., cron jobs), it must be a separate, opt-in mechanism — not part of `syncAgendaStatuses`.
