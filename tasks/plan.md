# Implementation Plan: Personality quiz example, and shared simulation code

_Spec: [`docs/specs/personality-quiz.md`](../docs/specs/personality-quiz.md) (approved 2026-11-27). Tasks: [`tasks/todo.md`](todo.md). Earlier plans: [`tasks/matchmaking/`](matchmaking/), [`tasks/group-segment-wizard/`](group-segment-wizard/)._

## Overview

Build the app in `examples/004-quizzes`: a `QuizRoom` that a crowd of simulated participants (real people
from the sampled IPIP-FFM data) and real phones answer, and a `/demo` page where the vote matrix fills in live. First,
move the generic parts of `002`'s simulation into `packages/common/src/simulation/` and move `002` onto them, so `004`
is built on the shared code from the start.

Read `skills/engineering-standards/` before writing code. Browser checks use `mise exec node@24.16.0 -- agent-browser`.

## Architecture decisions

- **`@playtest-kit/common/simulation` is its own export**, next to `.` and `./server`, so a Worker never imports
  `agents/client`. It holds sim ids, `SimSocket` / `ConnectSim`, `connectToRoom(agent, room)`, `randomDelay`,
  `straySimIds` and a generic crowd with its hook. `useDisposeOnUnmount` goes to `common/hooks/effects/`.
- **The generic crowd builds sims with a factory and takes a limit.** What a sim does, and settings that apply to the
  whole crowd (`002`'s auto-confirm, `004`'s speed), stay in each example, layered on the crowd.
- **`004` reuses `002`'s shapes:** pure reducer and thin Agent, snapshots not event streams, roles via `?role=`, a stable
  `sessionId` per phone tab. New: host snapshots are throttled (250 ms) inside `QuizRoom`; participants' views aren't.
- **Statement text never crosses the socket.** The page and the Worker both bundle `sources/ipip-bffm-items.json`
  through one typed module (`src/items/items.ts`); messages carry item ids.
- **The scaffold is copied into the existing folder**, since `pnpm new-example` would make `005`. `README.md`,
  `sources/`, `scripts/` and `.gitignore` are kept; the template's README parts are merged into the existing one.
- **The load check comes as soon as sims exist (T10)**, before the matrix and layout work, so if the room or the
  browser can't take 200 sims at ×20, the fix lands before anything is built on top.

## Dependency graph

```
T1 sim ids, sockets, connectToRoom ──► T2 generic crowd + hook ─────────────────────────┐
                                                                                         ▼
T3 scaffold 004 ──► T4 items + chooseStatements ──► T5 protocol + reducer ──► T6 QuizRoom + host controls ──► T7 /participate
                                                                                         │
                                                                     T2 + T6 ──► T8 QuizSim + sim controls ──► T9 speed + fast-forward ──► T10 load check
                                                                                                                                              │
                                                                                         T11 vote matrix ──► T12 info area ──► T13 layout + docs
```

T1–T2 (`shared-simulation`) and T3–T7 (`quiz-core`) don't depend on each other and can run in parallel.

## Task list

### Phase 1: Shared simulation (`shared-simulation`)
- [x] T1: Sim ids, socket types, `connectToRoom`, `randomDelay` and `straySimIds` move to `common/simulation`
- [x] T2: A generic crowd and its hook move to `common/simulation`; `002`'s crowd is built on it

### Checkpoint A
- [x] `002` and `common` pass test, typecheck, lint and build; manual check of `002`'s sims on `/demo`.

### Phase 2: Quiz core (`quiz-core`)
- [x] T3: Scaffold `004` from the template into the existing folder
- [x] T4: Typed statements, and `chooseStatements`
- [x] T5: Protocol and room reducer
- [x] T6: `QuizRoom`, throttled host snapshots, and the quiz controls on `/demo`
- [x] T7: `/participate`: start, wait, answer with Skip and Undo, done; QR join on `/demo`

### Checkpoint B
- [x] A phone tab completes a quiz of N = 10 started from `/demo`, with skip, undo, reload and latecomers both ways
      (spec criteria 2, 5, 8–10). `004` passes test, typecheck, lint and build.

### Phase 3: Quiz demo (`quiz-demo`)
- [x] T8: Simulated participants from the sampled responses, with count and skip-threshold controls
- [x] T9: Speed and fast-forward
- [x] T10: Load check at 200 sims × 50 statements × ×20, and fixes
- [x] T11: The vote matrix
- [x] T12: The info area for statements and people
- [ ] T13: `/demo` layout, no layout shifts, and docs

### Checkpoint C: complete
- [ ] All 14 spec success criteria pass. Repo-wide `pnpm lint`, `pnpm typecheck`, tests, and the `002`/`004` builds pass.
- [ ] Review, then PR (regular merge commit).

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `setState` on every answer: at 200 sims × ×20, hundreds of state writes a second, each the whole matrix | High | T10 measures it. If it's the bottleneck, keep the in-memory state current and persist at most every 250 ms (like the host throttle), or store answers as rows in the Agent's SQL. Decide with numbers, not ahead of them. **T10 (2026-11-27, dev server, Chrome):** it was the bottleneck. Saving on every answer capped the room at ~330 answers/s with workerd at ~93% CPU, so 200 sims × 50 at ×20 (which asks ~670/s) took ~35 s. Keeping the state in memory and saving through the same 250 ms `Throttle` (at once on a phase change) gave ~635 answers/s at ~60% CPU: all 200 finished in ~16 s, every answer in the host snapshot. Host snapshots: ~4 a second, up to ~107 KB each |
| A browser's cap on open WebSockets (Firefox's default may be 200 in all; Chrome's limits differ) below 200 sims + the host socket | High | T10 checks Chrome and Firefox. If capped, say so on the page and lower the limit, or run sims over fewer sockets (an "Ask first" change to the spec). **T10:** Chrome opened all 200 sim sockets plus the host's. Firefox isn't checked yet: agent-browser drives only Chrome-based engines, so it needs a manual check (or Playwright, which needs asking first) |
| The host snapshot of a 200 × 50 matrix re-renders the whole matrix 4 times a second | Med | T11 renders cells cheaply (one element per cell, colour from a class, no per-cell components with state), and T13's trace checks criterion 12. Fall back to a `<canvas>` only if the trace fails |
| Moving `002` onto the generic crowd changes its behaviour (newest-out order, names, auto-confirm on new sims) | Med | T2 keeps `002`'s crowd tests unchanged and passing, plus the Checkpoint A manual check |
| Copying the template by hand misses something `new-example.mjs` does (renames, port) | Low | T3 reads the script and repeats each step; the build and `dev` prove it |
| `chooseStatements` and the reducer outgrow the complexity budget (cccc) | Low | Small functions picked by event type, as `002`'s reducer does |

## Open questions

None.
