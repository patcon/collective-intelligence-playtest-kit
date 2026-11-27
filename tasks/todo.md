# Tasks: Personality quiz example, and shared simulation code

Plan: [`plan.md`](plan.md). Spec: [`docs/specs/personality-quiz.md`](../docs/specs/personality-quiz.md). Paths are relative to the repo root. In each package, `pnpm test`, `pnpm typecheck`, `pnpm lint` and `pnpm build` (where it has one) run there. Browser checks use `mise exec node@24.16.0 -- agent-browser`.

## Phase 1: Shared simulation (`shared-simulation`)

### Task 1: Sim ids, socket types, `connectToRoom`, `randomDelay` and `straySimIds` move to `common/simulation`

**Description:** Create `packages/common/src/simulation/` behind a new `./simulation` export. Move `newSimId`, `isSimId`, the `sim-` prefix, `SimSocket` and `ConnectSim` there unchanged. `connectToRoom` takes the agent name (and role, default `participant`) instead of importing `002`'s `AGENT`. `randomDelay(minMs, maxMs)` replaces `002`'s fixed 2–8 s, and `straySimIds` takes a list of participant ids and this page's sim ids instead of `002`'s snapshot. `002` imports all of them and deletes its copies. No change in `002`'s behaviour.

**Acceptance criteria:**
- [x] `@playtest-kit/common/simulation` exports these; `.` and `./server` don't, and nothing under `common/src/server` imports them.
- [x] `isSimId`, `randomDelay` (stays in range, injected random) and `straySimIds` have tests in `common`; `002`'s `straySimIds.test.ts` moves there, adapted to ids.
- [x] `002` has no own copy of these; its tests pass.

**Verification:** `pnpm test`, `pnpm typecheck`, `pnpm lint` in `packages/common` and `examples/002-matchmaking`; `pnpm build` in `002`.

**Dependencies:** None

**Files likely touched:** `packages/common/package.json`, `packages/common/src/simulation/{simIds,connectToRoom,randomDelay,straySimIds}.ts` (+ tests), `packages/common/src/simulation.ts` (entry), `examples/002-matchmaking/src/simulation/{SimulatedCrowd,SimulatedParticipant,connectToRoom}.ts`, `examples/002-matchmaking/src/demo/straySimIds.ts` (deleted), `examples/002-matchmaking/src/pages/Demo.tsx`

**Estimated scope:** Medium

### Task 2: A generic crowd and its hook move to `common/simulation`; `002`'s crowd is built on it

**Description:** Add a generic crowd to `common/simulation`: a store (`subscribe` / `getState`) of sims built by a factory `(id) => Sim` (where a `Sim` has `id` and `dispose()`), with `setCount` kept within 0 and a limit given to the constructor, newest out first, and names "Sim 1"… by position. Add a hook that owns a crowd for a component's life, and move `useDisposeOnUnmount` to `common/hooks/effects/`. `002`'s `SimulatedCrowd` keeps auto-confirm and `found(id)` on top of the generic crowd (limit 50), and its `useSimulation` wraps the shared hook.

**Acceptance criteria:**
- [x] The generic crowd has tests in `common`: limit, newest out first, names, `dispose` closes every sim, listeners told on each change.
- [x] `002`'s `SimulatedCrowd.test.ts` and `SimulatedParticipant.test.ts` pass unchanged (apart from imports).
- [x] `packages/common/README.md` documents the `simulation` export.

**Verification:** `pnpm test`, `pnpm typecheck`, `pnpm lint` in `packages/common` and `002`; `pnpm build` in `002`.

**Dependencies:** T1

**Files likely touched:** `packages/common/src/simulation/{SimCrowd,useSimCrowd}.ts` (+ test), `packages/common/src/hooks/effects/useDisposeOnUnmount.ts`, `packages/common/src/{index,simulation}.ts`, `packages/common/README.md`, `examples/002-matchmaking/src/simulation/{SimulatedCrowd,useSimulation}.ts`, `examples/002-matchmaking/src/hooks/effects/useDisposeOnUnmount.ts` (deleted)

**Estimated scope:** Medium

## Checkpoint A

- [x] `packages/common` and `002`: test, typecheck, lint; `002` builds.
- [x] Manual check of `002` on `/demo`: add and remove sims (up to 50), auto-confirm on and off, "found them" on a sim's card, clear stray sims from a second tab.
- [ ] Review before Phase 3 builds on it.

## Phase 2: Quiz core (`quiz-core`)

### Task 3: Scaffold `004` from the template into the existing folder

**Description:** Copy `examples/000-template` into `examples/004-quizzes`, doing what `scripts/new-example.mjs` does (skipping `node_modules`, `dist`, `.alchemy` and build info; replacing the template's name in `package.json`, `index.html`, `src/App.tsx`, `alchemy.run.ts`, `vite.config.ts`), but keeping the existing `README.md`, `sources/`, `scripts/` and `.gitignore`. Add `scripts/` to the typecheck as `003` does. Replace the template's counter with the routes: `/` redirects to `/demo`, and `/demo` and `/participate` are lazy placeholders. Add `004` to the root `deploy` / `destroy` scripts and `landing/apps.ts`.

**Acceptance criteria:**
- [ ] `pnpm --filter 004-quizzes dev` serves `/demo` and `/participate`; `/` lands on `/demo`.
- [ ] No template counter code is left; `README.md`, `sources/`, `scripts/sample-responses.ts` and `.gitignore` are as they were, plus a "Run it" section in the README.
- [ ] `004` builds, and is listed on the landing page.

**Verification:** `pnpm install`; in `004`: `pnpm typecheck`, `pnpm lint`, `pnpm build`; open `/` in the dev server.

**Dependencies:** None

**Files likely touched:** `examples/004-quizzes/{package.json,index.html,alchemy.run.ts,vite.config.ts,port.ts,offline.ts,tsconfig.json,oxlint.config.ts}`, `src/{App,main}.tsx`, `src/pages/{Demo,Participate}.tsx`, `worker/index.ts`, root `package.json`, `landing/apps.ts`, `pnpm-lock.yaml`

**Estimated scope:** Medium (many files, but copied)

### Task 4: Typed statements, and `chooseStatements`

**Description:** `src/items/items.ts` reads `sources/ipip-bffm-items.json` into typed `Item`s (id, text, trait, keyed), with `TRAITS` and lookups by id, usable in the page and the Worker. `src/room/chooseStatements.ts` picks N, as the spec's "Choosing the statements" says: `floor(N / 5)` per trait, one more for `N mod 5` random traits, random within each trait, returned in the test's order. `rng` is injected.

**Acceptance criteria:**
- [ ] For every N from 1 to 50: N distinct ids, per-trait counts differ by at most 1, in the items file's order.
- [ ] The same seed gives the same choice; N = 50 gives every statement in order.
- [ ] `items.ts` has 50 items, 10 per trait, and its types reject a trait or id that isn't in the file.

**Verification:** `pnpm test`, `pnpm typecheck`, `pnpm lint` in `004`.

**Dependencies:** T3

**Files likely touched:** `src/items/items.ts` (+ test), `src/room/chooseStatements.ts` (+ test), `src/room/rng.ts` (seeded rng and `shuffle`, as in `002`)

**Estimated scope:** Small

### Task 5: Protocol and room reducer

**Description:** `src/room/protocol.ts`: the messages, `QuizConfig`, `ParticipantView` and `RoomSnapshot` from the spec, with `parse*` functions that validate at the boundary. `src/room/quizRoom.ts`: the pure `reduce(state, event, rng)` over join, leave, ready, answer, undo, config, start and reset, with `viewFor` and `snapshotOf` selectors.

**Acceptance criteria:**
- [ ] Reducer tests cover: Start refused with no one ready; Start choosing statements (via `chooseStatements`) and moving ready people to `answering`; an answer only at the sender's position (others ignored); skip as `null`; reaching `done`; undo at the first statement, mid-quiz, and from `done` (clearing that answer); latecomers waiting (`late`, then included at the next Start) and joining (start at statement 1); leave and reconnect keeping answers; Reset clearing everything and forgetting anyone gone; config applying at the next Start.
- [ ] Parser tests reject unknown types, unknown item ids, answers outside 1–5, and config with N outside 1–50 or an unknown latecomers value.

**Verification:** `pnpm test`, `pnpm typecheck`, `pnpm lint` in `004`.

**Dependencies:** T4

**Files likely touched:** `src/room/protocol.ts` (+ test), `src/room/quizRoom.ts` (+ test), `src/room/roomSelectors.ts`

**Estimated scope:** Medium

### Task 6: `QuizRoom`, throttled host snapshots, and the quiz controls on `/demo`

**Description:** `worker/QuizRoom.ts`, a thin `agents` `Agent` like `002`'s `MatchRoom`: roles from `?role=`, socket events to reducer events, `setState`, each participant's view sent at once, and the host snapshot through a throttle (the first change sends at once, later ones within 250 ms fold into one send, phase changes send at once). The throttle is a pure, clock-injected helper with tests. `/demo` connects as host and shows `QuizControls`: statements (N, 1–50), latecomers (wait / join), Start (disabled with the reason when no one is ready), Reset, the phase and counts, and the room status badge.

**Acceptance criteria:**
- [ ] Throttle tests: one send per 250 ms window under a burst, the last state always sent, phase changes not delayed.
- [ ] From `/demo`, config, Start and Reset reach the room, and the snapshot shows phase, chosen statements and participants.
- [ ] Start is disabled with "No one is ready yet" (or similar) when no one is ready (spec criterion 2).

**Verification:** `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` in `004`; in the dev server, `/demo` connects and Start/Reset work with one `/participate` tab.

**Dependencies:** T5

**Files likely touched:** `worker/{index,QuizRoom}.ts`, `src/room/{client,hostThrottle}.ts` (+ test), `src/demo/QuizControls.tsx`, `src/pages/Demo.tsx`

**Estimated scope:** Medium

### Task 7: `/participate`: start, wait, answer with Skip and Undo, done; QR join on `/demo`

**Description:** `/participate` connects with a stable `sessionId`, shows the shared `StartScreen` (Start takes the wake lock and sends `ready`), then a screen per status: waiting, late, answering ("7 / 30", the statement, five large buttons Disagree … Agree, Skip, Undo hidden on the first statement), and done (with Undo). `/demo` gets a join panel with the shared `JoinQrCode` to `/participate`.

**Acceptance criteria:**
- [ ] A phone tab answers, skips and undoes, and the host snapshot reflects each within ~1 s (spec criterion 8).
- [ ] A reload mid-quiz returns to the same statement with answers kept (criterion 10).
- [ ] With latecomers set to wait, a tab joining mid-quiz sees "You'll join the next one"; set to join, it starts at statement 1 (criterion 9).

**Verification:** `pnpm typecheck`, `pnpm lint`, `pnpm build` in `004`; agent-browser: `/demo` plus one `/participate` tab through a quiz of N = 10.

**Dependencies:** T6

**Files likely touched:** `src/pages/Participate.tsx`, `src/participant/{AnsweringScreen,WaitingScreen,DoneScreen}.tsx`, `src/demo/JoinPanel.tsx`, `src/pages/Demo.tsx`

**Estimated scope:** Medium

## Checkpoint B

- [ ] A phone tab completes a quiz of N = 10 started from `/demo`, with skip, undo, a reload, and latecomers both ways.
- [ ] `004`: test, typecheck, lint, build.
- [ ] Review before Phase 3.

## Phase 3: Quiz demo (`quiz-demo`)

### Task 8: Simulated participants from the sampled responses, with count and skip-threshold controls

**Description:** `src/simulation/responses.ts` loads `sources/ipip-ffm-responses.json` and draws people at random without repeats from those who skipped at most the threshold (over all 50). `QuizSim` is a headless participant over `common/simulation`'s `connectToRoom`: `ready` on connect; while `answering`, after a random 3–9 s wait, it sends its person's answer to the statement at its position (or a skip). It never undoes. `004`'s `useSimulation` builds a crowd of `QuizSim`s (limit 200) and keeps each sim's person (sample row, country, skips) for the page. `SimControls`: people (default 50) and skipped at most (default: no limit), applying straight away.

**Acceptance criteria:**
- [ ] `QuizSim` tests (fake socket and clock): answers its person's real answers in order, skips where they skipped, waits within 3–9 s, never sends `undo`.
- [ ] Drawing tests: respects the threshold, never repeats a person, and says so when the threshold leaves fewer people than asked for.
- [ ] On `/demo`, 50 sims join by default and answer through a quiz; the count can't go above 200 (criteria 3, 4, 6).

**Verification:** `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` in `004`; agent-browser: 50 sims through N = 10.

**Dependencies:** T2, T6

**Files likely touched:** `src/simulation/{responses,QuizSim,useSimulation}.ts` (+ tests), `src/simulation/SimControls.tsx`, `src/pages/Demo.tsx`

**Estimated scope:** Medium

### Task 9: Speed and fast-forward

**Description:** A speed setting (×1, ×2, ×5, ×10, ×20) for the crowd, dividing each wait that starts after it changes, and "Fast-forward to finished", which makes every sim on this page send all its remaining answers at once. Real phones are untouched.

**Acceptance criteria:**
- [ ] `QuizSim` tests: every wait is within 3–9 s divided by the speed; fast-forward sends every remaining answer in order and nothing after (criterion 7).
- [ ] On `/demo`, fast-forward fills every sim's answers within 2 s.

**Verification:** `pnpm test`, `pnpm typecheck`, `pnpm lint` in `004`; agent-browser: 50 sims at ×10, then fast-forward.

**Dependencies:** T8

**Files likely touched:** `src/simulation/{QuizSim,useSimulation}.ts` (+ test), `src/simulation/SimControls.tsx`

**Estimated scope:** Small

### Task 10: Load check at 200 sims × 50 statements × ×20, and fixes

**Description:** Run the heaviest case the spec allows and measure: the room's write rate and CPU time per message, snapshot size and rate on `/demo`, and whether Chrome and Firefox open all 201 sockets. Fix what fails, inside the spec (for example: persist `setState` at most every 250 ms, or answers as SQL rows). Anything that would change the spec (lowering the 200 limit, sharing sockets between sims) is asked about first. Record the numbers in the plan's Risks table.

**Acceptance criteria:**
- [ ] 200 sims finish a 50-statement quiz at ×20 with every answer in the host snapshot, in Chrome.
- [ ] Firefox either does the same or the page says why it can't (and the spec is updated after asking).
- [ ] The numbers and any fix are written down in `tasks/plan.md`.

**Verification:** agent-browser in the dev server and in `preview` (workerd); `pnpm test` if the room changed.

**Dependencies:** T9

**Files likely touched:** `worker/QuizRoom.ts`, `src/room/hostThrottle.ts`, `tasks/plan.md`

**Estimated scope:** Small to Medium (depends on what it finds)

### Task 11: The vote matrix

**Description:** `src/demo/VoteMatrix.tsx` draws the host snapshot: one row per participant (real phones first, then sims in join order, named from the page's sims or "Phone …"), one column per chosen statement numbered 1…N, fixed-size cells on a diverging five-step scale, a distinct skip mark, and a blank for not answered yet. A legend shows the scale, skip and blank. Colours meet contrast in light and dark themes. In the lobby it shows the rows and no columns.

**Acceptance criteria:**
- [ ] Each sim's row matches its person's answers in `ipip-ffm-responses.json` for the chosen statements (criterion 6).
- [ ] Skips and blanks are told apart without colour alone (the skip mark is a shape).
- [ ] Cells and headers have fixed sizes: new answers and new rows never move anything above or beside the matrix.

**Verification:** `pnpm typecheck`, `pnpm lint`, `pnpm build` in `004`; agent-browser: screenshot mid-quiz with sims and a phone, in both themes.

**Dependencies:** T8

**Files likely touched:** `src/demo/{VoteMatrix,MatrixLegend}.tsx`, `src/demo/answerColours.ts`, `src/styles.css`, `src/pages/Demo.tsx`

**Estimated scope:** Medium

### Task 12: The info area for statements and people

**Description:** A fixed-height info area on `/demo`. Hovering or focusing a column number shows the statement: number, id, text, trait, and keying ("reversed" for `keyed: -1`). Hovering a row shows the person: name, phone or sim, and for this page's sims the sample row, country and real-data skips, plus how many statements they've answered. Column numbers and row names are keyboard-focusable.

**Acceptance criteria:**
- [ ] Hovering column 7 shows that statement's text, trait and keying; hovering a sim's row shows its country and skips (criterion 11).
- [ ] The area's height never changes, empty or full; nothing on the page moves when it updates.
- [ ] The same details are reachable by keyboard focus.

**Verification:** `pnpm typecheck`, `pnpm lint` in `004`; agent-browser: hover a column and a row, compare screenshots for movement.

**Dependencies:** T11

**Files likely touched:** `src/demo/{InfoArea,VoteMatrix}.tsx`, `src/pages/Demo.tsx`

**Estimated scope:** Small

### Task 13: `/demo` layout, no layout shifts, and docs

**Description:** Lay out `/demo` as the spec's sketch: the header and blurb, then the simulation controls (first and most prominent), quiz controls and join panel, then the info area, then the matrix last. Reserve widths for counts and labels so live numbers don't shift anything. Take a performance trace at 200 sims × 50 × ×20. Update `004`'s README (pages, layout, patterns, how to run) and `002`'s if its layout changed in Phase 1.

**Acceptance criteria:**
- [ ] The simulation controls are the first panel on `/demo` (criterion 1).
- [ ] In the trace, hover feedback is within 100 ms and no main-thread task is over 200 ms (criterion 12).
- [ ] The README covers the pages, the simulation, the throttle, and the sources.

**Verification:** repo-wide `pnpm lint`, `pnpm typecheck`; tests and builds in `common`, `002`, `004`; agent-browser trace and screenshots.

**Dependencies:** T10, T12

**Files likely touched:** `src/pages/Demo.tsx`, `src/demo/*.tsx`, `examples/004-quizzes/README.md`, `examples/002-matchmaking/README.md`

**Estimated scope:** Medium

## Checkpoint C: complete

- [ ] All 14 spec success criteria pass.
- [ ] Repo-wide `pnpm lint` and `pnpm typecheck`; tests in `common`, `002`, `004`; `002` and `004` build.
- [ ] Review, then PR (regular merge commit).

## Later (not in this plan)

- [ ] **Sims that use Undo.** Sometimes go back and change an answer, so the matrix shows answers changing (spec: out of scope for now).
- [ ] **Move the host snapshot throttle to `common`** once a second example needs it.
