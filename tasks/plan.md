# Implementation Plan: GroupSegmentWizard drives the room's grouping

_Spec: [`docs/specs/group-segment-wizard.md`](../docs/specs/group-segment-wizard.md) (approved 2026-11-26). Tasks: [`tasks/todo.md`](todo.md). The previous plan (matchmaking) is in [`tasks/matchmaking/`](matchmaking/)._

## Overview

Make `GroupSegmentWizard` (the compact layout) the room's grouping control. The splitting maths moves from the prototype into `src/matching/`. The matcher deals into exactly the sizes the bar shows, so Min really makes `15·5`. One `startBlocker` covers both the UI and the room reducer. The wizard sends `config` messages instead of keeping its own state. `/demo` loses its grouping selects. The other layouts stay as code that nothing renders.

All work is in `examples/002-matchmaking` unless a task says otherwise. Read `skills/engineering-standards/` before writing code.

## Architecture decisions

- **`Grouping` is renamed for clarity and gains `fit` on the size branch only:** `{ by: 'groupSize'; groupSize: number; fit: 'smart' | 'min' | 'max' } | { by: 'groupCount'; groupCount: number }`. Today's `size` / `count` were ambiguous (size of what?). The rename is its own mechanical task (T0), so T1's diff is only about `fit`. The default becomes group size 3, Smart.
- **`src/matching/split.ts` is the single source** for `groupSizes`, `startBlocker` and `groupConcerns`. The bar, the Start button, the reducer and `match` all call it.
- **`match` hands out people in chunks of `groupSizes`** instead of round-robin. That's what makes Min (`15·5`) true. With `random` ordering, the result is statistically the same for the other fits.
- **The cue's `maxDistinct` is a `startBlocker` argument.** `CUE_TYPES` already loads in the Worker, so the reducer can enforce it. `repeatWarning` is deleted.
- **No migration code.** `MatchRoom.onStart` already resets a config that `isMatchConfig` rejects to `DEFAULT_CONFIG`, so a room saved without `fit` heals itself.
- **The wizard's state is the room's `grouping`.** Which number the emcee sets is `grouping.by`. The only local state is what that leaves out: the number not being set and the last fit chosen, remembered for switching back. `nextGrouping(grouping, action, ready)` is a pure function holding every step, cycle and switch.
- **Variants are kept but not shown** (decided 2026-11-26). This is an exception to engineering-standards' "no dead code", so the folder's header comment says so and links to the spec.

## Dependency graph

```
T0 rename ──► T1 Grouping.fit + groupSizes ──► T2 shared startBlocker ──► T3 match deals into groupSizes
                       │                                                         │
                       └──────────────► T4 nextGrouping (pure) ──────────────────┤
                                                                                 ▼
                                                 T5 graduate wizard, drive room ──► T6 variants: hide ──► T7 /demo panel + docs
```

T4 depends only on T1, so it can run alongside T2 and T3. T8 (50 sims) depends on nothing.

## Task list

### Phase 1: Grouping model (`grouping-model`, `room-grouping`)
- [x] T0: Rename `Grouping`'s fields to `groupSize` / `groupCount`
- [x] T1: `Grouping` gains `fit`; `groupSizes` in `split.ts`
- [x] T2: One `startBlocker` for the UI and the room
- [x] T3: `match` deals into `groupSizes`

### Checkpoint A
- [x] `pnpm test`, `pnpm typecheck` and `pnpm lint` pass. A 20-sim round on `/demo` still works through the old selects.

### Phase 2: The wizard drives the room (`emcee-control`)
- [x] T4: `nextGrouping`, the wizard's logic as a pure function
- [ ] T5: Graduate `GroupSegmentWizard` and wire it to the room
- [ ] T6: Variants kept as code, not shown
- [ ] T7: Remove `/demo`'s grouping selects, and update the docs
- [ ] T8: Up to 50 simulated participants (independent, any time)

### Checkpoint B: complete
- [ ] All 7 spec success criteria pass. Review before PR.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| The compact layout reads `Division` (prototype state) deeply, so rewiring it to `grouping` + `onChange` is a bigger change than moving files | Med | T4 pins down the behaviour as a pure function first, so T5 only swaps where the state comes from |
| Changing the default from "by size, extras join" to Smart changes the groups existing demos get | Low | This is intended (spec). Smart never leaves anyone alone, and old rooms reset on load |
| `cccc` complexity budget on `groupSizes` / `nextGrouping` | Low | One small function per fit or action, picked from a lookup table, as `ALGORITHMS` is |
| At 50 sims, the bar can have 25 segments (pairs) and become cramped on a phone | Med | T8's browser check looks at it. If it's unreadable, raise it before changing the bar, since that's a design call |
| Two hosts set the wizard at once | Low | Last write wins, the same as today's selects. Each host sees the room's snapshot |

## Open questions

None.
