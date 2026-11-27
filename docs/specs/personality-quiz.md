# Spec: Personality quiz example, and shared simulation code

_Status: approved (2026-11-27), not built. Intent agreed in conversation the same day; summarized under Objective._

## Objective

Build the app in `examples/004-quizzes`. An evaluator opens `/demo` on a desktop and watches a room answer
the 50 real IPIP-BFFM statements (`sources/ipip-bffm-items.json`). As people answer, a participant × statement
**vote matrix** fills in live. Most of the room is simulated: each simulated participant is a real person from
`sources/ipip-ffm-responses.json`, answering with that person's real answers and skips, at a life-like pace. Real
phones join by QR code at `/participate` and answer the same statements.

The point, for now, is only to see a room responding to these actual statements, including what partial data
looks like. Nothing downstream of the matrix is built yet.

The example is named `004-quizzes`, not after this one quiz, because more quizzes may follow; the abstractions they
share are found then, not guessed now.

At the same time, move the generic parts of `002`'s simulated participants into `packages/common`, under a
`simulation` namespace, and move `002` onto them.

**User:** an evaluator (mostly the author) trying out the tool. This app isn't run at an event or as a playtest.

### User stories

- As an evaluator, I open `/` and land on `/demo`. The simulation controls are the most prominent thing on it.
- As an evaluator, I set how many people to simulate (default 50, at most 200) and the most statements any of them
  may have skipped in the real data (only people who skipped at most that many are drawn).
- As an evaluator, I set how many statements the quiz uses (N, 1 to 50) and whether people who join after Start
  wait for the next quiz or join the one in progress. I press Start, and Reset to go back.
- As an evaluator, I watch the matrix fill in as the room answers. I speed the simulation up (×2, ×5, ×10, ×20) or
  fast-forward the simulated participants to finished.
- As an evaluator, I hover a column number to see that statement, and a row to see who that person is.
- As a participant on a phone, I scan the QR code, tap Start, wait for the quiz, then answer one statement per
  screen on the five-point scale, with Skip and Undo, until I'm done.

### Out of scope

- Personality scores, clustering, embeddings or any other analysis of the matrix (future work).
- Polis-style processing: no vote filtering or Polis conventions beyond showing the answers.
- Simulated participants using Undo. **Later:** sims that sometimes go back and change an answer.
- Real per-statement timings from the raw data. Sims wait a random time instead.
- An `/emcee` page.
- Different statement orders for different people.

## Capability map

| Module id | Responsibility | Depends on |
|---|---|---|
| `shared-simulation` | Move the generic parts of `002/src/simulation/` into `packages/common/src/simulation/`, exported as `@playtest-kit/common/simulation`. Move `002` onto them with no change in behaviour. | — |
| `quiz-core` | `004` scaffold, the `QuizRoom` agent, protocol, room reducer, statement selection, `/participate`. | — |
| `quiz-demo` | `/demo`: room controls, simulation controls and simulated participants, QR join, the matrix and its info area. | `shared-simulation`, `quiz-core` |

Build order: `shared-simulation` → `quiz-core` → `quiz-demo`. `quiz-core` doesn't need the shared simulation code, so
the first two can go in either order. Extracting first lets `002`'s tests and a manual check prove the extraction
before `004` depends on it.

## What moves to `packages/common/src/simulation/` (from reading `002`)

| Piece | Today in `002` | Goes to |
|---|---|---|
| Sim ids: `newSimId`, `isSimId`, the `sim-` prefix | `simulation/SimulatedCrowd.ts` | `common/simulation`, unchanged |
| `SimSocket`, `ConnectSim` | `simulation/SimulatedParticipant.ts` | `common/simulation`, unchanged |
| `connectToRoom(room)`: a headless `AgentClient` as a participant | `simulation/connectToRoom.ts`, hardcoded to `002`'s `AGENT` | `common/simulation`, taking the agent name (and role) as arguments |
| The crowd: a store of sims, `setCount` up to a limit, newest out first, `subscribe` / `getState`, names "Sim 1"… | `simulation/SimulatedCrowd.ts`, which also knows auto-confirm and "found" | `common/simulation` as a generic crowd that builds each sim with a factory and takes its own limit (`002`: 50, `004`: 200). Auto-confirm and "found" stay in `002`, layered on the generic crowd |
| `randomDelay` (2–8 s) | `simulation/SimulatedCrowd.ts` | `common/simulation` as `randomDelay(minMs, maxMs)` |
| `straySimIds` | `demo/straySimIds.ts`, over `002`'s snapshot | `common/simulation`, over a list of participant ids |
| `useDisposeOnUnmount` | `hooks/effects/useDisposeOnUnmount.ts` | `common/hooks/effects/` (the house rule location), exported from `@playtest-kit/common` |
| A hook that owns a crowd for a component's life (`useSimulation`'s first three lines) | `simulation/useSimulation.ts` | `common/simulation` as a generic hook. Each example's `useSimulation` wraps it |

Stays in each example's own folder: what a sim does (`002`'s `SimulatedParticipant`: ready, then "found them";
`004`'s: answer the next statement), and the simulation controls UI (`002`'s `SimControls`; `004`'s are different).

`common/simulation` is client-only: nothing in it is imported by a Worker. It sits behind its own `./simulation`
export so a Worker never pulls in `agents/client`.

## Quiz design (`004`)

### Routes

- `/` redirects to `/demo` with `history.replaceState`, on the client.
- `/demo` and `/participate` are each their own `lazy()` chunk.
- One room, named `demo`. No `/emcee`.

### Roles, phases and participant status

- Roles (connection tags from `?role=`): `participant` (real phones and sims, treated the same) and `host` (`/demo`).
- Room phases:
  - `lobby`: participants become ready and wait.
  - `quiz`: the statements are chosen and people answer them.
- Moves between phases:
  - **Start** (from `lobby`) chooses the statements and goes to `quiz`. Refused, with the reason shown, if no one is ready.
  - **Reset** (from either phase) clears every answer and the chosen statements, and sends everyone back to waiting.
- Participant status:
  - `start`: on the device only, before they tap Start (the room calls this `joined`: connected, not yet ready).
  - `waiting`: ready, in the lobby.
  - `answering`: in the quiz, at statement `position` (0 to N − 1).
  - `done`: answered or skipped all N.
  - `late`: joined during the quiz while latecomers are set to wait. They wait for the next Start.
- With latecomers set to join, someone who becomes ready during the quiz goes straight to `answering` at the first statement.
- Someone who leaves during the quiz is kept, with their answers, so they come back to the same place. Anyone who
  leaves the lobby, and anyone still gone at Reset, is forgotten.

### Choosing the statements

At Start, the reducer picks N of the 50 statements at random, as evenly across the five traits as possible:
`floor(N / 5)` from each trait, then one more from each of `N mod 5` traits chosen at random. Within a trait the
statements are picked at random. The chosen statements are then put back in the test's order (the order of
`ipip-bffm-items.json`), and everyone answers them in that order. The choice is fixed until Reset.

### Pattern: pure room reducer, thin Agent (as in `002`)

All room logic is a pure `reduce(state, event, rng) → state` in `src/room/quizRoom.ts`. `QuizRoom` (an `agents`
`Agent`) turns socket events into reducer events, stores the result with `setState`, sends each participant their
own view, and sends the host a snapshot.

### Pattern: snapshots, throttled to the host

As in `002`, the room sends whole snapshots, not event streams. One difference: with up to 200 sims at ×20 speed,
the room may take hundreds of answers a second, and a full snapshot of a 200 × 50 matrix is tens of kilobytes. So:

- **Each participant** gets their own `ParticipantView` straight away after each change to them.
- **The host** gets a full `RoomSnapshot` at most every 250 ms (the first change sends at once, later ones within the
  window are folded into the next send). Phase changes are sent at once.

### Protocol (`src/room/protocol.ts`, validated at the boundary)

```ts
type Answer = 1 | 2 | 3 | 4 | 5 | null; // null: skipped
type ParticipantMessage =
  | { type: 'ready' }
  | { type: 'answer'; item: ItemId; answer: Answer } // must be the statement at their position
  | { type: 'undo' }; // back one statement, clearing that answer
type HostMessage = { type: 'config'; config: QuizConfig } | { type: 'start' | 'reset' };
type ToParticipant = { type: 'view'; view: ParticipantView };
type ToHost = { type: 'snapshot'; snapshot: RoomSnapshot };

interface QuizConfig {
  statementCount: number; // N, 1 to 50; default 50; applies at the next Start
  latecomers: 'wait' | 'join'; // default 'wait'
}
interface ParticipantView {
  status: 'waiting' | 'answering' | 'done' | 'late';
  statements: ReadonlyArray<ItemId>; // the chosen statements, in order; empty in the lobby
  position: number; // index into statements
  answers: Readonly<Partial<Record<ItemId, Answer>>>; // so Undo can show what they picked
}
interface RoomSnapshot {
  phase: 'lobby' | 'quiz';
  config: QuizConfig;
  statements: ReadonlyArray<ItemId>;
  participants: ReadonlyArray<{ id: string; status: ParticipantStatus; connected: boolean; answers: Readonly<Partial<Record<ItemId, Answer>>> }>;
}
```

- Ids as in `002`: a phone passes a stable per-tab id (`sessionId`), sims use `sim-` ids.
- An `answer` for any statement other than the one at the sender's position is ignored. That makes double taps and
  late duplicates harmless.
- `undo` at the first statement does nothing. `undo` when `done` goes back to the last statement.
- Statement text lives in `ipip-bffm-items.json`, bundled by both the page and the Worker. Messages carry only ids.

### Simulated participants (`src/simulation/`)

- **Who they are:** each sim is one person from `ipip-ffm-responses.json`, drawn at random without repeats from those
  who skipped at most the threshold (counted over all 50 statements, so it's known before Start). Changing the
  threshold applies to sims added after the change.
- **What they do:** a headless participant over its own socket (from `common/simulation`). It sends `ready` on
  connect. While `answering`, it waits a random time, then sends its person's answer to the statement at its position,
  or a skip where that person skipped it. It never undoes.
- **Pace:** each wait is random between 3 and 9 s at ×1, a live room answering with some time pressure. The speed
  setting (×1, ×2, ×5, ×10, ×20) divides the wait, and applies to the waits that start after it's changed.
- **Fast-forward:** every sim on this page answers all its remaining statements straight away. Real phones are not
  affected.
- **Details for the matrix:** the page keeps each of its own sims' person (sample row, country, how many they skipped in
  the real data) locally; it's not sent through the room. Sims from another tab show as a sim with no details.

### `/demo` layout (desktop)

```
┌ Simulation ─────────────────────┐ ┌ Quiz ────────────────────────┐ ┌ Join ─────┐
│ People   [ 50 ]  (max 200)      │ │ Statements [ 50 ]  (1–50)    │ │ [QR code] │
│ Skipped at most [ 5 ]           │ │ Latecomers  ◉ wait ○ join    │ │ /particip…│
│ Speed  ×1 ×2 ×5 ×10 ×20         │ │ Lobby · 52 ready             │ │           │
│ [ Fast-forward to finished ]    │ │ [ Start ]          [ Reset ] │ │           │
└─────────────────────────────────┘ └──────────────────────────────┘ └───────────┘
┌ Info (fixed height) ──────────────────────────────────────────────────────────┐
│ #7 EXT2 · Extraversion, reversed — "I don't talk a lot."                       │
│ Sim 12 · row 48211 · CA · skipped 1 of 50 in the real data · 31 / 50 answered  │
└────────────────────────────────────────────────────────────────────────────────┘
┌ Matrix ────────────────────────────────────────────────────────────────────────┐
│        1  2  3  4  5  6  7 …                        Legend: 1 ▇ 2 ▇ 3 ▇ 4 ▇ 5 ▇ │
│ 📱 You ▇  ▇  ·                                              skipped ╳  blank ·   │
│ Sim 1  ▇  ▇  ▇  ╳  ▇  ▇  ▇                                                       │
│ Sim 2  ▇  ▇  ▇  ▇  ·                                                             │
└────────────────────────────────────────────────────────────────────────────────┘
```

- **Simulation controls** are first and most prominent. People, threshold and speed apply straight away (adding or
  removing sims, as in `002`).
- **Matrix:**
  - One row per participant, real phones first, then sims in join order. One column per chosen statement, numbered
    1…N; the headers show only numbers.
  - Each cell is coloured on a diverging scale: Disagree, Slightly disagree, Neutral, Slightly agree, Agree. A
    skipped statement has its own mark, clearly different from one not answered yet. Colours meet contrast in light
    and dark themes.
  - In the lobby, the matrix shows the participants with no columns yet.
- **Info area:** hovering (or focusing) a column number shows that statement: its number, id, text, trait and
  keying. Hovering a row shows that person: name, real phone or sim, the sim's sample row, country and real-data
  skips, and how many statements they've answered. It's a fixed-height area on the page, not a floating popup, so
  nothing moves when it changes. (A floating popup is fine where there's no room for the area.)
- **No layout shifts:** hovering, live updates and status changes never move other content. Cells have a fixed size;
  counts and labels reserve their width; the matrix is last on the page so new rows only extend it downward.
- **Performance:** at 200 sims, 50 statements and ×20 speed, hover feedback within 100 ms and no main-thread task
  over 200 ms (success criterion 12).

### Participant (`/participate`, mobile)

Built from the shared `StartScreen`. The page connects on load and sends `ready` after Start, as in `002`. The wake
lock is taken on Start.

- `waiting`: "Waiting for the quiz to start…"
- `late`: "The quiz has already started. You'll join the next one."
- `answering`: "7 / 30", the statement, five large buttons (Disagree … Agree), Skip, and Undo (hidden on the first
  statement). A tap sends the answer and moves on. Undo goes back one statement and shows what was picked.
- `done`: "You're done. Thanks!", with Undo to go back to the last statement.

## Tech stack

Same as `002`: React 19.3.1, Kumo 2.19.0, `agents` 0.34.0, Vite 8.3.8, Tailwind 4.3.5, tsrs 0.25.0-ts7.1.0-beta
(TS 7), vitest 5.1.0, and Alchemy 2.0.0-beta.87 for dev and deploy. No new dependencies are expected.

## Commands

```
pnpm install
pnpm --filter 004-quizzes dev          # Alchemy dev server, port in port.ts
pnpm --filter 004-quizzes dev:lan      # HTTPS on LAN, for real phones
pnpm --filter 004-quizzes test
pnpm --filter 002-matchmaking test
pnpm --filter @playtest-kit/common test
pnpm lint && pnpm typecheck                     # repo-wide
pnpm --filter 002-matchmaking build && pnpm --filter 004-quizzes build
```

`pnpm new-example` would make `005-…`, since `004-quizzes/` already exists. Copy `000-template` into the
existing folder instead (keeping `README.md`, `sources/`, `scripts/` and `.gitignore`), as the script does otherwise.
Add `004` to the root `deploy`/`destroy` scripts and the landing page, as `003` was.

## Project structure (`examples/004-quizzes`)

```
sources/ipip-bffm-items.json  sources/ipip-ffm-responses.json   # existing
scripts/sample-responses.ts                                      # existing
src/
  App.tsx                      # redirect + lazy routes
  pages/Demo.tsx  pages/Participate.tsx
  items/items.ts               # typed access to the statements: id, text, trait, keying
  room/protocol.ts (+test)     # messages, QuizConfig, ParticipantView, RoomSnapshot
  room/quizRoom.ts (+test)     # pure reducer
  room/chooseStatements.ts (+test)
  participant/                 # screens for waiting / late / answering / done
  demo/QuizControls.tsx  demo/JoinPanel.tsx  demo/VoteMatrix.tsx  demo/InfoArea.tsx
  simulation/QuizSim.ts (+test)  simulation/responses.ts  simulation/useSimulation.ts  simulation/SimControls.tsx
  hooks/effects/
worker/index.ts  worker/QuizRoom.ts
README.md
```

## Code style

Follow `skills/engineering-standards`. Lint enforces the house rules: effects only in `hooks/effects/`, no inline
comments, cognitive complexity ≤ 15, cyclomatic complexity ≤ 10, no hand-written memoization, named exports, and file
names that match their main export.

The pure core looks like this (sketch; `shuffle` and `Rng` as in `002/src/matching/`):

```ts
/** N statements spread evenly across the traits (any remainder to random traits), back in the test's order. */
export function chooseStatements(items: ReadonlyArray<Item>, count: number, rng: Rng): Array<ItemId> {
  const byTrait = TRAITS.map((trait) => shuffle(items.filter((item) => item.factor === trait), rng));
  const extra = new Set(shuffle(TRAITS, rng).slice(0, count % TRAITS.length));
  const chosen = new Set(byTrait.flatMap((pool, t) => pool.slice(0, Math.floor(count / TRAITS.length) + (extra.has(TRAITS[t]) ? 1 : 0))));
  return items.filter((item) => chosen.has(item)).map((item) => item.id);
}
```

## Testing strategy

- **Unit (vitest), required:**
  - statement choice: N from 1 to 50 gives N distinct statements, per-trait counts differ by at most 1, test order
    kept, same seed gives the same choice
  - the room reducer: Start and Reset, Start refused with no one ready, answers at the right position only, skip,
    undo (first statement, middle, from `done`), latecomers waiting or joining, reconnect keeping answers
  - protocol parsers reject bad input (unknown item, answer outside 1–5, bad config)
  - the host snapshot throttle: one send per window, phase changes at once
  - `QuizSim` with a fake socket and clock: answers its person's real answers in order, skips where they skipped,
    speed divides the wait, fast-forward finishes at once, never undoes
  - drawing sims: respects the skip threshold, no repeats
  - `common/simulation`: the crowd's count limit and newest-out-first, `isSimId`, `straySimIds`
- **`002` regression:** its tests pass after moving onto `common/simulation`, and a manual check on `/demo`: add and
  remove sims, auto-confirm, "found them" on a card.
- **End to end (browser):** use `agent-browser` (`mise exec node@24.16.0 -- agent-browser`). Don't use the Chrome
  extension, and don't run Playwright directly. Run 50 sims plus one `/participate` tab through a quiz, and check the
  success criteria below.

## Boundaries

- **Always:**
  - Run lint, typecheck, tests and build in every package touched before calling a step done.
  - Keep `002`'s behaviour identical.
  - Validate every socket message at the boundary.
  - Update the READMEs (`004`, `002` if its layout changes, `packages/common`) in the same change.
- **Ask first:**
  - Adding any dependency.
  - Moving anything to `common` that only one example uses.
  - Changing `000-template` or `scripts/new-example.mjs`.
  - Running Playwright directly.
- **Never:**
  - Put simulation code in the Worker or `QuizRoom`.
  - Weaken lint or complexity limits to pass.
  - Commit the raw dataset or anything from `.cache/`.

## Success criteria

1. Opening `/` lands on `/demo`, with the simulation controls the most prominent thing on it.
2. With no one ready, Start is disabled and the page says why.
3. 50 sims are added by default; the count goes up to 200 and no further.
4. With a skip threshold of 0, every sim drawn answered all 50 statements in the real data; with a higher threshold,
   some sims skip, and their skips show in the matrix with the skip mark.
5. With N = 12, Start chooses 12 statements, 2 or 3 per trait, shown in the test's order, the same for everyone, and
   fixed until Reset.
6. Each sim's answers in the matrix match its person's row in `ipip-ffm-responses.json`.
7. Every sim wait falls within 3–9 s divided by the speed (×1: 3–9 s; ×10: 0.3–0.9 s), checked in the `QuizSim` unit
   test with a fake clock. Fast-forward fills every sim's row within 2 s on `/demo`.
8. A phone at `/participate` can answer, skip and undo, and its row (at the top of the matrix) updates within ~1 s.
9. With latecomers set to wait, a phone that joins during the quiz sees the "next one" message and isn't in this quiz;
   set to join, it starts at statement 1.
10. A phone that reloads during the quiz comes back to the same statement with its answers kept.
11. Hovering a column number shows its statement (text, trait, keying); hovering a row shows that person's details.
    Neither, nor live updates, shifts the layout.
12. At 200 sims, 50 statements and ×20, a performance trace of `/demo` shows hover feedback within 100 ms and no
    main-thread task over 200 ms.
13. `002` passes its tests and the manual check, imports its generic simulation code from
    `@playtest-kit/common/simulation`, and has its own copies deleted.
14. `pnpm lint`, `pnpm typecheck`, all tests, and the `002` and `004` builds pass.

## Decisions (resolved 2026-11-27)

1. **Skip threshold** counts a person's skips over all 50 statements, not just the N chosen, so sims can be drawn before Start.
2. **Undo** clears the answer it goes back over, so the cell shows "not answered" until it's answered again.
3. **Sim pace:** a uniform random 3–9 s per statement at ×1.
4. **Host snapshots** are throttled to one per 250 ms. That's a departure from `002`, needed for 200 sims at ×20. The
   throttle stays in `004` until a second example needs it; then it moves to `common`.
5. **Sim details** stay on the page that made the sims, not in the room protocol, for now.
6. **No room-level end:** the quiz runs until Reset; each person is `done` on their own.

## Open questions

None.
