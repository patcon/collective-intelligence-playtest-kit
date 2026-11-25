# Implementation Plan: Matchmaking example + shared room framework

_Spec: [`docs/specs/matchmaking.md`](../docs/specs/matchmaking.md) (approved 2026-11-25). Tasks: [`tasks/todo.md`](todo.md)._

## Overview

There are three modules, built in order:

1. **`shared-room`** creates `packages/common` and moves `001-valence-remote` onto it. `001`'s
   behaviour doesn't change.
2. **`matchmaking-core`** builds `examples/002-matchmaking`'s room, engine, protocol and phone flow.
3. **`matchmaking-demo`** adds `/demo-ui`'s panels, the simulated participants, and the avatar and
   birdsong cues.

The riskiest part comes first: a TS-source workspace package that Vite, tsrs, vitest and the
Worker bundle all have to consume. One real phone running a round with the colour cue comes next,
before anything is added around it.

## Architecture decisions

- **`createRoomClient({ agent, parse })` factory** in `common`. It returns a typed `RoomProvider`,
  `useRoomMessages`, `useRoomSend` and `useRoomStatus` for one agent and protocol. Each example writes
  one line (`src/room/client.ts`), and its imports barely change. This avoids passing generics at every
  call site.
- **Effect hooks live in `common/src/hooks/effects/`**, because `RoomProvider` needs `usePageVisibility`.
  `ui` depends on `common`, never the reverse. `RoomStatusBadge` in `ui` takes `status` as a prop.
- **Stable participant id:** a `sessionStorage` id is passed to the socket's `id` option, so a reload
  keeps the same group and cue. `001` keeps its current behaviour, where a new id after a reload means a
  new phone row.
- **The room is a pure reducer, with `MatchRoom` as a thin Agent shell.** Snapshots go to the host and a
  personal view goes to each participant (see the spec's Patterns sections).
- **Cue assignment is injected into the reducer** (`assignCues(type, groupCount, rng)`), so the reducer
  doesn't change as cue types are added.
- **Simulation** is headless `AgentClient`s in `src/simulation/`. Lint checks that it only imports
  `room/protocol.ts` (or review checks it, if oxlint can't express that rule).

## Phases

- **Phase 1: `shared-room` (Tasks 1–5).** Ends at Checkpoint A, where `001` behaves the same and is
  verified by you.
- **Phase 2: `matchmaking-core` (Tasks 6–10).** Ends at Checkpoint B, where one real tab completes a
  colour round.
- **Phase 3: `matchmaking-demo` (Tasks 11–14).** Ends at Checkpoint C, a 20-sim round.
- **Phase 4: cues and docs (Tasks 15–17).** Ends at Checkpoint D, where every success criterion passes.

## Parallelization

The work is mostly sequential. Some tasks can run in parallel once their dependencies are done:

- Tasks 7 (engine) and 8 (protocol/reducer) can run alongside Task 6 (scaffold).
- Tasks 15 (avatar) and 16 (birdsong) are independent after Checkpoint C.
- Task 17 (docs) can start drafting after Checkpoint B.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| A workspace TS-source package isn't resolved by tsrs, the Worker bundle (Alchemy/workerd), or vitest | High | Task 1 proves it with the smallest possible export before anything moves |
| Moving hooks out of `ui` breaks EmbeddingViewer stories | Med | Task 3 runs `test:unit` and `test:stories` |
| Generic `RoomProvider` changes `001`'s reconnect or visibility behaviour | Med | Moved code is kept byte-for-byte apart from types. Checkpoint A has a manual check with a hidden tab |
| iOS doesn't play birdsong after the Start tap (autoplay) | Med | Play through the `AudioContext` that `unlockAudio` resumed, not `<audio>`. You verify on a real iPhone at Checkpoint D |
| 20 `AgentClient`s from one tab hit browser or dev-proxy limits | Low | Task 12 tests with 20 early, and the room sends small snapshots |
| `agent-browser` can't run two origins or tabs well | Low | Fall back to 2 tabs in one session. If it's still blocked, stop and ask |
| Birdsong clip licences | Low | CC0 or CC-BY only, with attribution in `ATTRIBUTION.md`. Anything else is "ask first" |

## Verification commands

```
pnpm lint && pnpm typecheck
pnpm --filter @playtest-kit/common test
pnpm --filter @playtest-kit/ui test:unit && pnpm --filter @playtest-kit/ui test:stories
pnpm --filter 001-valence-remote test && pnpm --filter 001-valence-remote build
pnpm --filter 002-matchmaking test && pnpm --filter 002-matchmaking build
mise exec node@24.16.0 -- agent-browser …   # browser checks; never the Chrome extension
```

## Open questions

None. Anything that comes up during the build goes back into the spec first.
