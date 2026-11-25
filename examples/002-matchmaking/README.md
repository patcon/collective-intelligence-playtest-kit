# 002-matchmaking

A realtime matchmaking demo: participants tap Start on their phones, the host starts a round, each
group gets a cue (a colour, for now), and people find the others with the same cue and tap
"found them". Built from [`000-template`](../000-template) on the shared room pieces in
[`@playtest-kit/common`](../../packages/common) and [`@playtest-kit/ui`](../../packages/ui).
The design is in [`docs/specs/matchmaking.md`](../../docs/specs/matchmaking.md).

## Pages

- `/` redirects to `/demo-ui`.
- `/demo-ui`: the host. Config for the next round, the emcee's pane (counts, Start, Move on, Reset), a QR code to
  `/participate`, up to 20 simulated participants, and a card for everyone in the room.
- `/participate`: a participant. Start screen → "Waiting for the emcee…" → the group's cue → "You're a group of N".
  Its connection id is kept per tab (`sessionId`), so a reload comes back to the same group and cue.

## Layout

| Path | What it is |
| --- | --- |
| `src/matching/` | Pure matching engine: `match(ids, { algorithm, grouping }, rng)`, one file per algorithm |
| `src/cues/` | Cue types: `cueTypes.ts` (assign, `maxDistinct`; no React, so the Worker can use it) and `CueView.tsx` (rendering) |
| `src/room/matchRoom.ts` | The room as a pure reducer over join, leave, ready, found, config, start, move on and reset |
| `src/room/roomSelectors.ts` | `viewFor` (one participant's screen) and `snapshotOf` (the host's view of the room) |
| `src/room/protocol.ts` | Socket messages, validated at the boundary by `parse*` functions |
| `src/room/client.ts` | `participantRoom` and `hostRoom`, from `createRoomClient` |
| `src/demo/` | `/demo-ui`'s panels: `ConfigPanels`, `EmceePane`, `JoinPanel`, `ParticipantCards` |
| `src/simulation/` | Headless participants (`SimulatedParticipant`, `SimulatedCrowd`, `useSimulation`) on their own sockets. Lint lets it import only `room/protocol.ts` and effect hooks from the rest of the app, so it can only do what a phone can |
| `worker/MatchRoom.ts` | Thin `Agent`: socket events in, `setState`, views and snapshots out |

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Dev server with the Worker and `MatchRoom`, via `alchemy dev` (port 1337, from `port.ts`) |
| `pnpm dev:lan` | `dev`, on your LAN over HTTPS (self-signed), so phones get wake lock |
| `pnpm build` | Typecheck, then production build |
| `pnpm preview` | Production build with the Worker, served locally in workerd |
| `pnpm preview:lan` | `preview`, on your LAN over HTTPS like `dev:lan` |
| `pnpm test` | Vitest, once |
| `pnpm typecheck` | tsrs, for the page and then `worker/` (which has no DOM types) |
| `pnpm lint` | Oxlint, then the `cccc` complexity budget |
| `pnpm run deploy` / `pnpm run destroy` | Deploy or delete with [Alchemy](https://alchemy.run) (`alchemy.run.ts`) |

`alchemy.run.ts` and `previewWorker()` in `vite.config.ts` both declare `MatchRoom` and route
`/agents/*` to the Worker first; change them together. The house rules in
[`000-template`'s README](../000-template/README.md#house-rules-enforced-by-lint) apply.
