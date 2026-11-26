# Tasks: GroupSegmentWizard drives the room's grouping

Plan: [`plan.md`](plan.md). Spec: [`docs/specs/group-segment-wizard.md`](../docs/specs/group-segment-wizard.md). Paths are relative to `examples/002-matchmaking/`. Commands run there: `pnpm test`, `pnpm typecheck`, `pnpm lint`. Browser checks use `mise exec node@24.16.0 -- agent-browser`.

## Phase 1: Grouping model

### Task 0: Rename `Grouping`'s fields to `groupSize` / `groupCount`

**Description:** A rename only, with no change in behaviour: `{ by: 'size'; size }` becomes `{ by: 'groupSize'; groupSize }` and `{ by: 'count'; count }` becomes `{ by: 'groupCount'; groupCount }`, in the type, the validation, the default, and every reader and test. The prototype's own `Locked = 'groups' | 'size'` is UI state, not this type, so it's left alone.

**Acceptance criteria:**
- [ ] No `by: 'size'` / `by: 'count'` / `grouping.size` / `grouping.count` left anywhere in `src` or `worker`.
- [ ] The existing tests pass, changed only to use the new names.

**Verification:** `pnpm test` · `pnpm typecheck` · `pnpm lint`

**Dependencies:** None

**Files likely touched:** `src/matching/match.ts`, `src/room/matchConfig.ts`, `src/demo/ConfigPanels.tsx`, `src/demo/EmceePane.tsx`, and the tests that build groupings (`match`, `matchRoom`, `protocol`, `startBlocker`, `repeatWarning`, `straySimIds`)

**Estimated scope:** Medium (10 files, but mechanical)

### Task 1: `Grouping` gains `fit`; `groupSizes` in `split.ts`

**Description:** Add `Fit` and the `fit` field to the `groupSize` branch of `Grouping`. Port `sizesOf` / `sizesForSize` from the prototype into `src/matching/split.ts` as `groupSizes(n, grouping)`. Validation requires `fit`. The default is group size 3, Smart. `ConfigPanels` keeps working by setting `fit: 'smart'` when it builds a group-size grouping (it gets deleted in T7).

**Acceptance criteria:**
- [ ] Every worked example in the spec's Behaviour section is a passing case in `split.test.ts`, including `20 at Min 15 → 15·5` and `0 at count 3 → 0·0·0`.
- [ ] Table test over n = 0..50 × count 2..6 × size 2..5 × each fit: sizes sum to n, there are at least 2 groups, and they're largest first.
- [ ] `isMatchConfig` rejects a group-size grouping with no `fit` or an unknown `fit`, and the old `{ by: 'size', size }` shape (`protocol.test.ts`).

**Verification:** `pnpm test` · `pnpm typecheck` · `pnpm lint`

**Dependencies:** T0

**Files likely touched:** `src/matching/match.ts`, `src/matching/split.ts` (new), `src/matching/split.test.ts` (new), `src/room/matchConfig.ts`, `src/room/protocol.test.ts`, `src/demo/ConfigPanels.tsx`

**Estimated scope:** Medium

### Task 2: One `startBlocker` for the UI and the room

**Description:** Move `startBlocker` to `split.ts` as `startBlocker(ready, grouping, maxDistinct)`, built on `groupSizes`, with every blocker in the spec: fewer than 2 ready, anyone alone, more groups than the cue tells apart, or a group short of a Min. Add `groupConcerns`. The reducer's `start` and `EmceePane` both call it. `EmceePane` keeps its prototype blocker until T5.

**Acceptance criteria:**
- [ ] `split.test.ts` has a case for each blocker, plus "short of Min blocks" (17 at Min 12) and "Max with a small last group doesn't block" (13 at Max 3).
- [ ] `matchRoom.test.ts`: `start` leaves the state unchanged for each blocker, including too many groups for the cue.
- [ ] `src/demo/startBlocker.ts` and its test are gone. Nothing imports `smallestGroupSize`.

**Verification:** `pnpm test` · `pnpm typecheck` · `pnpm lint`

**Dependencies:** T1

**Files likely touched:** `src/matching/split.ts`, `src/matching/split.test.ts`, `src/room/matchRoom.ts`, `src/room/matchRoom.test.ts`, `src/demo/EmceePane.tsx`, `src/demo/startBlocker.ts` (+ test, deleted)

**Estimated scope:** Medium

### Task 3: `match` deals into `groupSizes`

**Description:** `match` splits the algorithm's ordered ids into chunks of `groupSizes(n, grouping)` instead of dealing round-robin. Delete `groupCount` and `smallestGroupSize`. Update the doc comments on `match` and `ALGORITHMS`: neighbours now share a group.

**Acceptance criteria:**
- [ ] `match.test.ts`: the group sizes `match` returns equal `groupSizes` across the T1 table. Every id is in exactly one group.
- [ ] `matchRoom.test.ts`: a started round's group sizes follow `groupSizes`, e.g. 32 at Min 15 → `16·16` and 13 at Min 3 → `4·3·3·3`. (20 at Min 15 is blocked by T2, so it can't start.)
- [ ] Neither `groupCount` nor `smallestGroupSize` is left anywhere in the code.

**Verification:** `pnpm test` · `pnpm typecheck` · `pnpm lint`

**Dependencies:** T2

**Files likely touched:** `src/matching/match.ts`, `src/matching/match.test.ts`, `src/room/matchRoom.test.ts`

**Estimated scope:** Small

## Checkpoint A: grouping model done
- [ ] `pnpm test`, `pnpm typecheck` and `pnpm lint` pass.
- [ ] Manual: `pnpm dev`, then on `/demo` with 20 sims and the old selects, Start makes groups and they confirm.
- [ ] Commit. Brief review with Patrick before Phase 2.

## Phase 2: The wizard drives the room

### Task 4: `nextGrouping`, the wizard's logic as a pure function

**Description:** `src/demo/GroupSegmentWizard/nextGrouping.ts`: `nextGrouping(grouping, action, ready, remembered)` returns the next `Grouping` and the remembered values. Actions: step groups ±1, step size ±1, switch to groups or size, and cycle the fit. Ported from `useDivision`'s `current` / `step` / `setLocked`.

**Acceptance criteria:**
- [ ] Switching between groups and size never changes `groupSizes` for the current `ready` (tested for n = 0..50).
- [ ] −/+ stop at 2 groups and 2 per group, never because of `ready`. Numbers stay at most two digits (≤ 99).
- [ ] Cycling the fit goes Smart → Min → Max → Smart, and the last fit comes back after switching to groups and back.

**Verification:** `pnpm test` · `pnpm lint`

**Dependencies:** T1

**Files likely touched:** `src/demo/GroupSegmentWizard/nextGrouping.ts` (new), `src/demo/GroupSegmentWizard/nextGrouping.test.ts` (new)

**Estimated scope:** Small

### Task 5: Graduate `GroupSegmentWizard` and wire it to the room

**Description:** Move the compact layout, `CycleTrack` and the bar/stepper parts into `src/demo/GroupSegmentWizard/`. Props: `grouping`, `ready`, `maxDistinct`, `onChange`, with no layout prop. It renders `groupSizes` and `groupConcerns`, and steps through `nextGrouping`. `EmceePane` passes `snapshot.config.grouping` and sends `{ type: 'config', config: { ...config, grouping } }`. Start's blocker is only the shared `startBlocker`. Remove `prototypeBlocker`, `useDivision`'s use in `EmceePane`, and the dev-only gate.

**Acceptance criteria:**
- [ ] Setting the wizard on `/emcee` changes `snapshot.config.grouping`. It's still set after a reload, and the same in a second host tab.
- [ ] With 17 sims at Min 12, the bar shows `12·5` with the 5 in orange, and Start is disabled.
- [ ] After Start, the round's group sizes match the bar (checked at 20 sims, Smart 3 and count 4).

**Verification:** `pnpm test` · `pnpm typecheck` · `pnpm lint` · browser check of the three criteria above

**Dependencies:** T2, T3, T4

**Files likely touched:** `src/demo/GroupSegmentWizard/GroupSegmentWizard.tsx`, `src/demo/GroupSegmentWizard/CycleTrack.tsx`, `src/demo/GroupSegmentWizard/parts.tsx` (all moved from the prototype folder), `src/demo/EmceePane.tsx`

**Estimated scope:** Medium

### Task 6: Variants kept as code, not shown

**Description:** In `prototype-group-segment-wizard/`, rename the component to `GroupSegmentWizardVariants` with a required `layout` prop over `groupsOnly | modeTabs | linkedPair | linkedPairWithFit`, and drop `compact` from it. Delete `LayoutSwitcher.tsx`, `useLayoutChoice` and the `?variant=` handling. Import `CycleTrack` and the parts from the graduated folder. Add a header comment saying it's kept unrendered on purpose (spec, 2026-11-26).

**Acceptance criteria:**
- [ ] Nothing outside `prototype-group-segment-wizard/` imports it, and `?variant=compact` on `/emcee` changes nothing.
- [ ] The folder still typechecks and lints.
- [ ] Neither `LayoutSwitcher` nor `useLayoutChoice` is left anywhere in the code.

**Verification:** `pnpm typecheck` · `pnpm lint`

**Dependencies:** T5

**Files likely touched:** `src/demo/prototype-group-segment-wizard/GroupSegmentWizard.tsx` → `GroupSegmentWizardVariants.tsx`, `variants.tsx`, `LayoutSwitcher.tsx` (deleted), `useDivision.ts`

**Estimated scope:** Small

### Task 7: Remove `/demo`'s grouping selects, and update the docs

**Description:** Remove Group by and Groups / People per group from `ConfigPanels`, and its `warning` prop. Delete `repeatWarning`. Algorithm, Cue and Display found count stay. Update the matchmaking spec's config panel and matching engine sections to point to the new spec. Tick "Block Start when there aren't enough cues" in `tasks/matchmaking/todo.md`. Set the spec's status to built.

**Acceptance criteria:**
- [ ] `/demo`'s config panel shows only Algorithm, Cue and Display found count.
- [ ] `repeatWarning` (and its test) is gone, and nothing passes `warning` to `ConfigPanels`.
- [ ] `docs/specs/matchmaking.md` no longer describes the grouping selects or round-robin dealing.

**Verification:** `pnpm test` · `pnpm typecheck` · `pnpm lint` · browser check of `/demo`'s panel

**Dependencies:** T5

**Files likely touched:** `src/demo/ConfigPanels.tsx`, `src/pages/Demo.tsx`, `src/demo/repeatWarning.ts` (+ test, deleted), `docs/specs/matchmaking.md`, `docs/specs/group-segment-wizard.md`, `tasks/matchmaking/todo.md`

**Estimated scope:** Medium

### Task 8: Up to 50 simulated participants

**Description:** Raise `MAX_SIMS` from 20 to 50. It's independent of the other tasks and can land any time. Check that `/demo`'s sim cards and the emcee's bar still read well at 50 (up to 25 pairs, so 25 bar segments).

**Acceptance criteria:**
- [ ] `/demo` adds sims up to 50 and no further (`SimulatedCrowd.test.ts` uses `MAX_SIMS`, so it covers this unchanged).
- [ ] A 50-sim round on `/demo` starts, and every group confirms.
- [ ] The matchmaking spec's "up to ~20" / "0 to 20" lines say 50.

**Verification:** `pnpm test` · browser check of a 50-sim round, with the bar at group size 2

**Dependencies:** None

**Files likely touched:** `src/simulation/SimulatedCrowd.ts`, `docs/specs/matchmaking.md`

**Estimated scope:** XS

## Checkpoint B: complete
- [ ] All 7 success criteria in the spec pass.
- [ ] `pnpm test`, `pnpm typecheck` and `pnpm lint` pass.
- [ ] Review with Patrick, then PR (regular merge commit).
