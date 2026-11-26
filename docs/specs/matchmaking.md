# Spec: Matchmaking example, and the first shared room framework

_Status: built (2026-11-25). Criterion 10, birdsong on real phones, is still to be checked on iOS Safari and Android Chrome. Intent: [`docs/intent/matchmaking.md`](../intent/matchmaking.md)._

## Objective

Build `examples/002-matchmaking`. An evaluator opens `/demo` on a desktop and watches a realtime
matchmaking flow work end to end. Real phones join by QR code, and simulated participants fill the
room. Participants grant permissions, wait for the emcee, get a cue, find their group in the room,
and tap "found them".

At the same time, start a small shared framework from what `001-valence-remote` and `002` both
actually use, and move `001` onto it. The goal is to find the shape each week's playtest app will
follow, without generalizing past two examples.

**User:** an evaluator trying to understand the tool. This app isn't run at an event or as a playtest.

### User stories

- As an evaluator, I open `/` and land on `/demo`. I see the configuration panels, an `EmceePane`, a QR code
  to `/participate`, and the simulated participants.
- As a participant on a phone, I scan the QR code, see a start screen, and tap Start. That grants audio and keeps
  the screen awake. I then see "Waiting for the emcee…".
- As the emcee (in `EmceePane`), I see how many people are ready, start a round, watch groups confirm
  ("4 of 6 groups found"), and move on whenever it's clear everyone has found each other.
- As a participant in a round, I see (or hear) my cue, find the people with the same cue, tap
  "found them", and see "You're a group of 3".
- As an evaluator, I add or remove simulated participants (0 to 20), set them to confirm automatically
  after a random delay, or tap "found them" on one of their cards myself.

## Capability map

The request covers two separable things, so the work splits into three modules, built in this order:

| Module id | Responsibility | Depends on |
|---|---|---|
| `shared-room` | Extract the room connection and other pieces both examples use into `packages/common` and `packages/ui`. Move `001` onto them with no change in behaviour. | — |
| `matchmaking-core` | The `002` backend and participant flow: `MatchRoom` agent, protocol, room reducer, matching engine, cue types, `/participate`. | `shared-room` |
| `matchmaking-demo` | `/demo`: config panels, `EmceePane`, QR join, simulation module and cards. | `matchmaking-core` |

Build order: `shared-room` → `matchmaking-core` → `matchmaking-demo`.

Extracting first means `001`'s existing tests and a manual check prove the extraction works before `002`
depends on it.

## What's actually shared (from reading `001` and `000-template`)

| Piece | Today | Used by 002? | Goes to |
|---|---|---|---|
| `RoomProvider`, `useRoom`, `useRoomSend`, `useRoomStatus` | `001/src/room/RoomProvider.tsx`, hardcoded to `ValenceRoom` and `RoomMessage` | yes | `common`, made generic over agent name, role and message parser |
| `useRoomMessages`, `useSendOnOpen` | `001/src/hooks/effects/` | yes | `common`, generic over the message type |
| `RoomStatusBadge` | `001/src/room/` | yes | `ui`, taking `status` as a prop (no room context) |
| `usePageVisibility`, `useWakeLock` | `001/src/hooks/effects/` | yes | `common` (`RoomProvider` needs `usePageVisibility`) |
| `useInterval`, `useOnChange` | **already duplicated** in `001` and `packages/ui` | yes | `common`. `ui` and `001` import them and delete their copies |
| `StartScreen` | `001/.../StartScreen.tsx`, title hardcoded | yes | `ui`, with title, instruction, illustration, warning and button label as props |
| `unlockAudio` / `unlockedAudio` | `001/.../lib/audio.ts` | yes (birdsong) | `common` |
| `JoinQrCode` (+ `uqr`) | `001/src/viewer/components/` | yes | `ui` |
| `CopyButton` | `001/src/viewer/components/` | probably not | stays in `001` |
| JSON message reading (`readMessage`) | private in `001/src/room/protocol.ts` | yes | `common` as `parseJsonObject` |
| Worker helpers: role from `?role=`, send to every connection with a role | inline in `ValenceRoom` | yes | `common/server` (two small functions, no base class) |
| Phases, host flow | — (`001` has none) | yes | **stays in `002`**. Only one example uses it. |
| `offline.ts` service worker | template only, not in `001` | yes (copied from the template) | stays per-example. Add `/agents/` to the denylist. |

Not shared: everything under `001/src/ValenceRemote/`, `phoneState`, remote settings, and `002`'s engine and cue types.

### Package layout

```
packages/common/                     # new: "@playtest-kit/common", no Kumo
  src/room/createRoomClient.tsx       # factory: typed RoomProvider + useRoom* hooks per agent/protocol
  src/room/sessionId.ts (+ test)      # stable per-tab connection id (sessionStorage)
  src/hooks/effects/                  # useRoomMessages, useSendOnOpen, usePageVisibility,
                                      # useWakeLock, useInterval, useOnChange (house rule location)
  src/parseJsonObject.ts (+ test)
  src/server/connections.ts (+ test)  # roleOf(connection, roles), sendToRole(agent, role, msg)
  src/audio/unlockAudio.ts
  src/index.ts, src/server.ts         # "." for client, "./server" for the Worker
packages/ui/                          # existing
  src/StartScreen/  src/JoinQrCode/  src/RoomStatusBadge/   # + one story each
```

`ui` depends on `common` (for the hooks). The reverse never happens.

## Matchmaking design (`002`)

### Routes

- `/` redirects to `/demo` with `history.replaceState`, on the client.
- `/demo` and `/participate` are each their own `lazy()` chunk, as in `001`.
- `/emcee` (added after the build), also its own chunk: `EmceePane` alone, connected as a host, for running the room from a phone.
- One room, named `demo`.

### Roles and phases

- Roles (connection tags from `?role=`):
  - `participant`: real phones and simulated participants, which are treated the same.
  - `host`: the `/demo` page, which carries both the config panels and `EmceePane`.
- Room phases:
  - `lobby`: participants become ready and wait.
  - `round`: groups are assigned, cues are shown and confirmations are tracked.
  - `activity` (added after the build): groups keep their cue and see a placeholder card for the activity that matching is for.
- Moves between phases:
  - **Start** (from `lobby`) goes to `round`. It's refused, and the emcee's button disabled with the reason, if anyone would be in a group of 1: fewer than 2 ready, or more groups asked for than the ready people can fill in twos (added after the build).
  - **Move on** goes from `round` to `activity`, then from `activity` back to `lobby`, and the next Start makes new groups. (Since the activity was added, the emcee's buttons read "Start matchmaking", "Start activity" and "End activity"; the messages are still `start` and `moveOn`.)
  - **Back** (added after the build) undoes a step: from `round` to `lobby`, as if the round hadn't started; from `activity` to `round`, keeping groups and ticks.
  - **Reshuffle groups** (added after the build) re-matches everyone ready into new groups and cues, as the same round, from `round` or `activity`. It follows Start's group-of-1 rule.
  - **Reset** was in the original build: it cleared groups from any phase and restarted the round count. Back and Reshuffle replaced it.
- What each participant sees:
  - `start`: on the device only, before they tap Start. The room calls this status `joined`: connected, not yet ready, so not matched.
  - `waiting`
  - `matched`: shows their cue, and how many in their group have marked found ("1 of 3 found").
  - `found`: shows the same count, live.
  - `late`: joined during a round. Their screen says they'll be matched next round.
  - `activity`: the placeholder activity card, with their group's cue and size.
- Someone who leaves mid-round or during the activity is kept, out of the counts, so they come back to the same group and cue. Anyone who leaves the lobby, and anyone still gone at Move on, Back or Reshuffle, is forgotten.

### Pattern: pure room reducer, thin Agent

All room logic is a pure `reduce(state, event, rng) → state` in `src/room/matchRoom.ts`. `MatchRoom`
(an `agents` `Agent`) only does four things:

1. Turns socket events into reducer events.
2. Stores the result with `setState`, so it survives hibernation.
3. Sends each participant their own view.
4. Sends the host a full snapshot.

This is the main pattern to carry forward. It makes the room testable without a Durable Object.

### Pattern: snapshots, not event streams

Rooms are small (≤ ~50 connections), so after every change the room sends:

- **to the host:** a full `RoomSnapshot` (phase, config, participants with status and group, and groups
  with confirmation counts).
- **to each participant:** their own `ParticipantView` (status, cue, group size, and how many in the group
  have marked found). A `found` from anyone in a group sends a new view to everyone in that group.
  It also carries the next round's cue type, so the start and waiting screens can say to turn the sound
  up before an audio round (added after the build).

Late joiners and reconnects get the same message as everyone else, so `001`'s catch-up logic isn't
needed. `001` keeps its event stream, because it streams high-rate valence and snapshots would be the
wrong choice there. The README records when to use which.

### Protocol (`src/room/protocol.ts`, validated at the boundary)

```ts
type ParticipantMessage = { type: 'ready' } | { type: 'found'; found: boolean }; // found: boolean added after the build
type HostMessage =
  | { type: 'config'; config: MatchConfig }
  | { type: 'start' | 'moveOn' | 'back' | 'reshuffle' }; // back and reshuffle replaced reset after the build
type ToParticipant = { type: 'view'; view: ParticipantView; nextCue: CueTypeId }; // nextCue added after the build
type ToHost = { type: 'snapshot'; snapshot: RoomSnapshot };

interface MatchConfig {
  algorithm: 'random';
  grouping: { by: 'size'; size: number } | { by: 'count'; count: number };
  cue: CueTypeId; // 'colour' | 'avatar' | 'birdsong'
}
```

- A participant's id is its connection id. PartySocket makes a new id each time a page loads unless one
  is passed in, so `/participate` passes a stable id kept in `sessionStorage` (one per tab, and it
  survives a reload). A phone that drops, reloads or comes back keeps its group and cue. Simulated
  participants use ids generated in memory.
- Config changes made during a round apply to the next round.

### Matching engine (`src/matching/`)

`match(ids, grouping, algorithm, rng) → Array<Array<id>>`. This is a pure function. `rng` is injected
so tests are deterministic.

- **random:** shuffle, then split into groups.
- **by size `k`:** `floor(n / k)` groups. Each leftover person joins a different existing group (with
  n=20, k=3 that gives 6 groups: two of 4 and four of 3). If `n < k`, everyone forms one group.
- **by count `c`:** `min(c, n)` groups, with sizes differing by at most 1.
- Edge cases: `n = 0` gives no groups (Start is disabled). `n = 1` gives one group of 1, which the engine allows but the room won't start (see Start, above).

The engine is laid out so that adding an algorithm means adding a single file, but it stays in `002`.

### Cue types (`src/cues/`)

Each cue type has the same shape:

- `assign(groupCount, rng) → Array<CuePayload>`: one distinct, serializable payload per group.
- A React component that renders the payload. It lives apart from `assign` and `maxDistinct` (`cues/CueView.tsx`, not `cues/cueTypes.ts`), so the Worker can import the cue types without React.
- `maxDistinct`: how many groups it can tell apart.

If there are more groups than `maxDistinct`, cues repeat and the demo page shows a warning.

| Cue | Payload | Render | maxDistinct |
|---|---|---|---|
| `colour` | `{ name, hex }` from a fixed named palette | Full-screen colour with its name as text, so it still works for colour-blind people | 12 |
| `avatar` | `{ style, seed }` | DiceBear avatar, large, rendered locally with `@dicebear/core` + `@dicebear/collection` so it works offline and phones make no third-party requests | effectively unlimited |
| `birdsong` | `{ species }` | Plays that species' recording on a loop, each phone starting after its own random delay of up to 3 s so a group isn't in unison. Sound-only: the species is named, small, only when the sound can't play (changed after the build; it first showed the name as well). About 6 short CC0 or CC-BY clips (for example from xeno-canto), bundled with their attribution in `public/birdsong/ATTRIBUTION.md` | number of bundled recordings (~6) |

Ship order inside this module: `colour` → `avatar` → `birdsong`.

### `/demo` layout (desktop)

```
┌ Config panels ───────┐ ┌ EmceePane (phone width) ┐ ┌ Join ─────────┐
│ Algorithm  [random]  │ │ Lobby · 7 ready         │ │ [QR code]     │
│ Group by   size|count│ │ [ Start round ]         │ │ /participate  │
│ Size/count [ 3 ]     │ │ Round · 4/6 groups found│ ├ Simulation ───┤
│ Cue  colour|avatar|… │ │ ▓▓▓▓░░  [ Move on ]     │ │ [+][-] 12 sims│
│ ⚠ cues will repeat   │ │ [ Reset ]               │ │ auto-confirm ☑│
└──────────────────────┘ └─────────────────────────┘ │ cards…        │
                                                     └───────────────┘
```

- **`EmceePane`:** mobile-first and small. It shows the phase, the ready count, progress (since the build, a
  "People found" bar with "x of y groups found" as secondary text; it was the other way round), and the
  Start, Move on and Reset buttons (since replaced; see Roles and phases). It only
  shows config read-only. Every "found" tap is counted per person and per group. A group counts as found
  once **any** member taps, but the counts are there so the emcee and participants can see who hasn't yet.
  Move on never waits for everyone.
- **Simulation (`src/simulation/`):** no imports from other `002` modules except `room/protocol.ts`.
  - Each `SimulatedParticipant` is a headless `AgentClient` with `role=participant`. It sends `ready`
    straight away and, if auto-confirm is on, sends `found` 2–8 s after it is matched.
  - The cards show a short name ("Sim 3"), their status badge, a small preview of their cue, and a
    "found them" button. They're drawn from the host snapshot by `demo/ParticipantCards.tsx`, not in
    `src/simulation/`, since they render cues and show real phones too.
  - Real participants also appear in the host snapshot, so they get cards too, with a "phone" badge and
    no button.

### Participant (`/participate`, mobile)

Built from the shared `StartScreen`. The Start tap unlocks audio and acquires the wake lock (with a
note if the screen may sleep). The page connects once it loads and sends `ready` after Start, so only
people past the start screen get matched.

What each screen shows:

- `waiting`: "Waiting for the emcee…"
- `matched`: the cue, full-screen, with a "Found them" checkbox and "x found" in the group. (It
  was a one-way button reading "x of N found"; since the build it's a checkbox that can be unticked
  during the round, and the count leaves out N.)
- `found`: "You're a group of N · x found", which updates live as others in the group tap. Showing
  the count is meant to nudge everyone to tap.
- `late`: "You'll be matched next round".

## Tech stack

Same as `001`: React 19.3.1, Kumo 2.19.0, `agents` 0.34.0, Vite 8.3.8, Tailwind 4.3.5, tsrs (TS 7),
vitest 5.1.0, and Alchemy 2.0.0-beta.87 for dev and deploy.

New dependencies (approved, exact versions pinned when added):

- `@dicebear/core` and `@dicebear/collection`, in `002`.
- `uqr`, moved from `001` into `packages/ui`.
- `agents`, added to `packages/common`.

## Commands

```
pnpm install
pnpm new-example matchmaking               # creates examples/002-matchmaking from 000-template
pnpm --filter 002-matchmaking dev          # Alchemy dev server, port in port.ts
pnpm --filter 002-matchmaking dev:lan      # HTTPS on LAN, for real phones
pnpm --filter 002-matchmaking preview      # production build, Worker in workerd
pnpm --filter 002-matchmaking test         # vitest
pnpm --filter @playtest-kit/common test
pnpm --filter @playtest-kit/ui test:unit && pnpm --filter @playtest-kit/ui test:stories
pnpm lint && pnpm typecheck                # repo-wide
pnpm --filter 001-valence-remote build && pnpm --filter 002-matchmaking build
```

## Project structure (`examples/002-matchmaking`)

```
src/
  App.tsx                     # redirect + lazy routes
  pages/Demo.tsx  pages/Participate.tsx
  room/protocol.ts (+test)    # messages, MatchConfig, ParticipantView, RoomSnapshot
  room/matchRoom.ts (+test)   # pure reducer
  matching/match.ts (+test)   matching/random.ts
  cues/cueTypes.ts  cues/colour/  cues/avatar/  cues/birdsong/   # each: assign (+test), component
  participant/                # screens for waiting / matched / found / late
  demo/ConfigPanels.tsx  demo/EmceePane.tsx  demo/JoinPanel.tsx
  simulation/SimulatedParticipant.ts  simulation/useSimulation.ts  simulation/SimCards.tsx
  hooks/effects/              # any effects, per house rule
public/birdsong/*.mp3         # bundled recordings + ATTRIBUTION.md
worker/index.ts  worker/MatchRoom.ts
README.md                     # how to run, plus a "Patterns" section
```

## Code style

Follow `skills/engineering-standards`. Lint enforces the house rules:

- effects only in `hooks/effects/`
- no inline comments
- cognitive complexity ≤ 15, cyclomatic complexity ≤ 10
- no hand-written memoization
- named exports, and file names that match their main export

The pure core looks like this:

```ts
/** Splits `ids` into groups, as `grouping` asks; leftovers join existing groups, one each. */
export function match(ids: ReadonlyArray<string>, grouping: Grouping, rng: Rng): Array<Array<string>> {
  const shuffled = shuffle(ids, rng);
  const count = groupCount(shuffled.length, grouping);
  return Array.from({ length: count }, (_, g) => shuffled.filter((_, i) => i % count === g));
}
```

## Testing strategy

- **Unit (vitest), required:**
  - the matching engine: sizes, leftovers, n=0/1/n<k, count > n, determinism with a seeded rng
  - the room reducer: every phase move, `found`, late join, reconnect keeping the assignment, config applying next round, reset
  - protocol parsers: reject bad input
  - cue `assign`: distinct up to `maxDistinct`
  - `common`: `parseJsonObject` and the connection helpers
- **Storybook (`packages/ui`):** one story each for `StartScreen`, `JoinQrCode` and `RoomStatusBadge`, run by `test:stories`.
- **`001` regression:** its existing tests pass unchanged. A manual check with `preview`: a phone
  joins, valence streams to the viewer, settings apply, and reconnecting after a hidden tab works.
- **End to end (browser):** use `agent-browser` (`mise exec node@24.16.0 -- agent-browser`). Don't use the
  Chrome extension, and don't run Playwright directly. Run a 20-sim round on `/demo` plus one real tab on
  `/participate`, and check every Success Criterion below.
- **Not tested:** the visuals of cue renderers beyond one story or manual look, and DiceBear's output.

## Boundaries

- **Always:**
  - Run lint, typecheck, tests and build in every package touched before calling a step done.
  - Keep `001`'s behaviour identical.
  - Validate every socket message at the boundary.
  - Update the READMEs in the same change.
- **Ask first:**
  - Adding any dependency beyond those listed under Tech stack.
  - Birdsong clips under any licence other than CC0 or CC-BY.
  - Changing `000-template`. It stays as it is until this work is complete.
  - Generalizing anything only one example uses.
  - Running Playwright directly.
- **Never:**
  - Put simulation code in the Worker or `MatchRoom`.
  - Weaken lint or complexity limits to pass.
  - Use squash or rebase merges.
  - Use `npm` or `npx`.

## Success criteria

1. Opening `/` lands on `/demo`.
2. With 0 participants, Start is disabled and the page explains why.
3. With 20 sims grouped by size 2, Start makes 10 groups of 2. With size 3, it makes two groups of 4 and four of 3.
   With count 4, it makes 4 groups of 5.
4. Each participant's cue matches their group's members and differs from other groups' cues (up to `maxDistinct`).
   When cues will repeat, the config panel warns before Start.
5. Tapping "found them" shows "You're a group of N" with the right N. Everyone in that group then sees
   "x of N found" go up within ~1 s, and so does `EmceePane` (groups found, and people found).
6. "Move on" works at any time during a round, whether or not everyone has confirmed, and returns everyone to "waiting".
7. A real phone that joins during a round sees "You'll be matched next round" and is included in the next one.
8. A participant who reloads or locks their phone during a round comes back to the same cue and group.
9. Simulated and real participants show up the same way in `EmceePane` counts. Removing sims mid-round
   updates the counts.
10. Birdsong plays on a phone after the Start tap with no extra tap, on iOS Safari and Android Chrome.
11. `001` passes its tests and the manual regression check, and imports the room, start screen, QR code
    and shared hooks from the packages, with its own copies deleted.
12. `pnpm lint`, `pnpm typecheck`, all tests and both examples' builds pass.
13. The `002` README has a "Patterns" section covering the pure reducer + thin Agent, snapshots vs event
    streams, roles via `?role=`, and the shared-package rule. `packages/common` has a README.

## Decisions (resolved 2026-11-25)

1. **Package name:** `packages/common` (`@playtest-kit/common`).
2. **DiceBear:** the library, so avatars work offline.
3. **Birdsong:** Claude picks about 6 short CC0 or CC-BY clips and records their attribution.
4. **Found:** every tap is counted per person and per group. Participants see "x of N found" for their
   group and the emcee sees totals. Moving on never needs everyone to tap.
5. **`000-template`:** stays as it is until this work is complete.

## Open questions

None.
