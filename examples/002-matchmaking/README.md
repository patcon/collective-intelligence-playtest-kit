# 002-matchmaking

A realtime matchmaking demo: participants tap Start on their phones, the host starts a round, each
group gets a cue (a colour, an avatar, or a birdsong every phone in the group plays), and people find the others with the same cue and tap
"found them". Built from [`000-template`](../000-template) on the shared room pieces in
[`@playtest-kit/common`](../../packages/common) and [`@playtest-kit/ui`](../../packages/ui).
The design is in [`docs/specs/matchmaking.md`](../../docs/specs/matchmaking.md).

## Pages

- `/` redirects to `/demo`.
- `/demo`: the host. Config for the next round, the emcee's pane (counts, Start matchmaking, Start activity, End activity, Reset), a QR code to
  `/participate`, up to 20 simulated participants, and a card for everyone in the room.
- `/participate`: a participant. Start screen → "Waiting for the emcee…" → the group's cue → "You're a group of N"
  → after Start activity, a placeholder card for the activity that matching is for → back to waiting when the emcee ends it.
  Its connection id is kept per tab (`sessionId`), so a reload comes back to the same group and cue.

## Layout

| Path | What it is |
| --- | --- |
| `src/matching/` | Pure matching engine: `match(ids, { algorithm, grouping }, rng)`, one file per algorithm |
| `src/cues/` | Cue types (`colour/`, `avatar/`, `birdsong/`): `cueTypes.ts` (assign, `maxDistinct`; no React, so the Worker can use it), `CueView.tsx` (full screen) and `CueChip.tsx` (on cards) |
| `src/room/matchRoom.ts` | The room as a pure reducer over join, leave, ready, found, config, start, move on and reset |
| `src/room/roomSelectors.ts` | `viewFor` (one participant's screen) and `snapshotOf` (the host's view of the room) |
| `src/room/protocol.ts` | Socket messages, validated at the boundary by `parse*` functions |
| `src/room/client.ts` | `participantRoom` and `hostRoom`, from `createRoomClient` |
| `src/activity/` | `ActivityCard`: a placeholder for the activity after matching, shown to participants and the emcee |
| `src/demo/` | `/demo`'s panels: `ConfigPanels`, `EmceePane` (shown in a `PhoneFrame`, since it's what the emcee holds), `JoinPanel`, `ParticipantCards` |
| `src/simulation/` | Headless participants (`SimulatedParticipant`, `SimulatedCrowd`, `useSimulation`) on their own sockets. Lint lets it import only `room/protocol.ts` and effect hooks from the rest of the app, so it can only do what a phone can |
| `worker/MatchRoom.ts` | Thin `Agent`: socket events in, `setState`, views and snapshots out |

## Patterns

These are the shapes to carry into the next playtest app.

### A pure reducer, and a thin Agent

All the room's logic is `reduce(state, event, deps)` in `src/room/matchRoom.ts`. It's pure: socket
events become plain events (`join`, `leave`, `ready`, `found`, `config`, `start`, `moveOn`, `reset`),
and randomness and cue assignment come in through `deps`. `worker/MatchRoom.ts` only:

1. turns `onConnect`, `onClose` and `onMessage` into reducer events,
2. keeps the result with `setState`, so it outlasts hibernation and restarts,
3. sends each participant their view (`viewFor`) and the host a snapshot (`snapshotOf`).

So every rule of the room is tested in `matchRoom.test.ts` without a Durable Object, a socket or a
browser. Write a new room the same way: the reducer and its tests first, then the Agent around it.

### Snapshots, or an event stream

This room sends **snapshots**: after every change, the whole of what each side needs (a view per
participant, the full room for the host). A client that joins late, reloads or reconnects gets the
same message as everyone else, so there's no catch-up logic, and no client can drift out of sync.
That fits rooms of tens of people whose state changes on taps.

[`001`](../001-valence-remote) streams **events** instead (`joined`, `valence`, `left`), because phones
send valence several times a second. Resending everything on each reading would cost far more, so it
keeps each phone's last message on its connection and replays those to a viewer that joins. Reach for
a stream when updates are frequent and small; otherwise, snapshots.

### Roles from `?role=`

Every client connects to the same room and says what it is in its socket URL (`?role=participant`,
`?role=host`). The Agent tags the connection with that role as it connects (`roleFromUrl` in
`getConnectionTags`), reads it back with `roleOf`, and sends to everyone in a role with `sendToRole`,
all from `@playtest-kit/common/server`. Each role parses its own messages (`parseParticipantMessage`,
`parseHostMessage`), so a participant's connection can't send the host's commands. A role is only what
the client says it is, though, not a login: anyone who opens `?role=host` is a host.

### One `createRoomClient` per role

`src/room/client.ts` makes a typed provider and hooks for each side of the protocol,
`createRoomClient<In, Out>({ agent, parse })`. A wrong message type is then a type error, not a
dropped message. Pages wrap themselves in `RoomProvider` with their role and use `useRoomMessages`,
`useRoomSend`, `useRoomStatus` and `useSendOnOpen`. `useSendOnOpen({ type: 'ready' })` sends again on
every reconnect, so a restarted room still learns who's ready.

### Stable ids

A participant's id is its connection id. `/participate` passes `sessionId('participant')`, kept in
`sessionStorage`, so a reload comes back as the same person, to the same group and cue. The room keeps
someone who leaves mid-round (out of the counts) until the round ends, in case they come back.

### Simulated participants speak only the protocol

`src/simulation/` opens real sockets with `role=participant`, exactly as a phone does. Lint lets it
import only `room/protocol.ts` (and effect hooks) from the rest of the app, and the Worker has no
simulation code. So whatever works for 20 sims works for 20 phones.

### Share only what two examples use

`@playtest-kit/common` (non-visual) and `@playtest-kit/ui` (components) hold only what both `001` and
`002` use. Matching, cues, phases and the simulation stay here until another example needs them.
`ui` may depend on `common`, never the reverse.

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

## Credits

Avatars are drawn on each device with [DiceBear](https://www.dicebear.com) (`@dicebear/core` and
`@dicebear/collection` 9.4.3), using two styles that are both CC0 1.0: "Thumbs" and "Shapes", by DiceBear.

The birdsong recordings are CC0, public domain or CC BY, from Wikimedia Commons; each is credited, with
how it was cut and encoded, in [`public/birdsong/ATTRIBUTION.md`](public/birdsong/ATTRIBUTION.md).
