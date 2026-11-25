# Tasks: Matchmaking example + shared room framework

Plan: [`plan.md`](plan.md). Spec: [`docs/specs/matchmaking.md`](../docs/specs/matchmaking.md).

Every task also meets the Definition of Done in `skills/engineering-standards`:

- lint, typecheck, tests and build pass in every package touched
- no duplicated logic
- docs updated in the same change

---

## Phase 1: `shared-room`

### Task 1: Scaffold `packages/common` and prove it resolves everywhere
**Description:** Create `@playtest-kit/common`, following `packages/ui`'s conventions:

- `package.json` with `"."` and `"./server"` exports that point at TS source
- tsconfig and oxlint config from `@playtest-kit/config`
- vitest
- a README stub

Move `001`'s private `readMessage` into `common` as `parseJsonObject` (with a test), and have
`001/src/room/protocol.ts` import it. This is the riskiest step, because tsrs, Vite, vitest and the
Worker bundle all have to resolve the package.

**Acceptance criteria:**
- [ ] `parseJsonObject` returns an object, or `null` for invalid JSON and non-objects (tested).
- [ ] `001`'s protocol and its Worker both use it. `001` has no `readMessage` left.

**Verification:**
- [ ] `pnpm --filter @playtest-kit/common test`, then `pnpm --filter 001-valence-remote test build typecheck`.
- [ ] `pnpm --filter 001-valence-remote preview`: a phone tab streams valence to the viewer.

**Dependencies:** None
**Files:** `packages/common/{package.json,tsconfig.json,oxlint.config.ts,README.md,src/index.ts,src/server.ts,src/parseJsonObject.ts,src/parseJsonObject.test.ts}`, `examples/001-valence-remote/{package.json,src/room/protocol.ts}`
**Scope:** M (mostly boilerplate)

### Task 2: Server connection helpers
**Description:** Add `roleOf(connection, roles, fallback)` and `sendToRole(agent, role, msg)` to
`common/src/server/connections.ts`. `ValenceRoom` uses them in place of its inline `roleOf` and
`toViewers` loop.

**Acceptance criteria:**
- [ ] Both helpers are typed over a role union and tested with fake connections.
- [ ] `ValenceRoom` behaves the same: viewers still get joined, left, valence and settings messages.

**Verification:**
- [ ] `pnpm --filter @playtest-kit/common test`. `001` builds.
- [ ] Manual check with `preview`: a viewer that opens after a phone sees that phone (catch-up).

**Dependencies:** 1
**Files:** `packages/common/src/server/connections.ts` (+test), `common/src/server.ts`, `001/worker/ValenceRoom.ts`
**Scope:** S

### Task 3: Move effect hooks into `common`
**Description:** Move `usePageVisibility`, `useWakeLock`, `useInterval` and `useOnChange` into
`common/src/hooks/effects/`.

- `ui` deletes its `useInterval` and `useOnChange` copies and imports them from `common`. `ui` adds
  `common` as a dependency.
- `001` deletes its copies of all four.
- `useLatestRef` and `useThreeScene` stay in `ui`, because only `ui` uses them.

**Acceptance criteria:**
- [ ] There is one copy of each hook in the repo.
- [ ] EmbeddingViewer and `001` import them from `@playtest-kit/common`.

**Verification:**
- [ ] `pnpm --filter @playtest-kit/ui test:unit test:stories`. `001` test and build pass. `pnpm lint` passes, including the effects-folder rule in `common`.

**Dependencies:** 1
**Files:** `common/src/hooks/effects/*` (4), `common/src/index.ts`, `ui/{package.json,src/EmbeddingViewer/EmbeddingViewer.tsx,src/hooks/effects/*}`, `001/src/**` imports
**Scope:** M (mostly file moves)

### Task 4: `createRoomClient` in `common`; `001` uses it
**Description:** Make `001`'s `RoomProvider`, `useRoomMessages` and `useSendOnOpen` generic:

- `createRoomClient<In, Out>({ agent, parse })` returns `{ RoomProvider, useRoom, useRoomSend, useRoomStatus, useRoomMessages, useSendOnOpen }`.
- `RoomProvider` accepts `role`, `room`, an optional `id`, and `closeWhenHidden` (`001` phones: true).
- Add `sessionId(key)`, which returns a per-tab id from `sessionStorage` and falls back to in-memory (with a test).

`001` gets `src/room/client.ts` (`createRoomClient({ agent: 'ValenceRoom', parse: parseRoomMessage })`)
and deletes `RoomProvider.tsx` and the two hooks.

**Acceptance criteria:**
- [ ] `001` keeps the same connection behaviour: reconnects with the same id after the tab is hidden, and
  uses `wss` on HTTPS LAN.
- [ ] Hooks are fully typed. A wrong message type is a type error in `001`.
- [ ] `sessionId` is stable across calls and falls back when storage throws (tested).

**Verification:**
- [ ] `common` and `001` tests pass, and the build passes.
- [ ] Manual check with `preview`: hide and show a phone tab, and it leaves then rejoins on the viewer.

**Dependencies:** 3
**Files:** `common/src/room/{createRoomClient.tsx,sessionId.ts,sessionId.test.ts}`, `common/src/hooks/effects/{useRoomMessages,useSendOnOpen}.ts` (or kept inside the factory file if lint allows), `001/src/room/client.ts`, `001` pages and dashboard imports
**Scope:** M

### Task 5: `StartScreen`, `JoinQrCode`, `RoomStatusBadge` in `ui`; `unlockAudio` in `common`
**Description:** Move the three components into `packages/ui`, each with one story:

- `StartScreen` takes `title`, `instruction`, `illustration`, `warning`, `startLabel` and `onStart`.
- `JoinQrCode` brings the `uqr` dependency with it.
- `RoomStatusBadge` takes `status` as a prop.

Move `unlockAudio` and `unlockedAudio` into `common/src/audio/`. Export them all, and have `001` use them.

**Acceptance criteria:**
- [ ] `001`'s start screen, QR panel and badge look and behave as before. Its title is passed in as a prop.
- [ ] Each component has a story that passes `test:stories`.

**Verification:**
- [ ] `ui` `test:stories` passes. `001` build passes.
- [ ] Visual check with `agent-browser` on `001`'s `/` and `/remote`: screenshots match before and after.

**Dependencies:** 4
**Files:** `ui/src/{StartScreen,JoinQrCode,RoomStatusBadge}/*` (component + story each), `ui/src/index.ts`, `ui/package.json`, `common/src/audio/unlockAudio.ts`, `001` imports and deletions
**Scope:** M–L. If it runs long, split it into 5a (StartScreen + audio) and 5b (QR + badge).

### ✅ Checkpoint A: `001` on the shared framework
- [ ] `pnpm lint && pnpm typecheck`. All tests in `common`, `ui` and `001` pass. `001` builds.
- [ ] `001` manual regression with `preview` (+ `preview:lan` on a real phone):
  - a phone joins
  - valence streams to the viewer
  - viewer settings apply live
  - hidden/shown reconnect works
  - the QR code opens `/remote`
- [ ] No duplicated copies left (`grep` for the old file names).
- [ ] **Your review before Phase 2.** Commit at this point.

---

## Phase 2: `matchmaking-core`

### Task 6: Scaffold `002-matchmaking` with routes and an empty `MatchRoom`
**Description:** Create the example and replace the template's counter with the room wiring:

- Run `pnpm new-example matchmaking`. Delete the counter (`src/counter`, `worker/Counter.ts`).
- Add `MatchRoom extends Agent` (it connects and does nothing else), and route `/agents/*` with
  `routeAgentRequest`.
- Update `alchemy.run.ts` and `vite.config.ts` previewWorker: `MatchRoom` binding, sql, and `runWorkerFirst: ['/agents/*']`.
- Add `/agents/` to `offline.ts`'s denylist.
- Set up `App.tsx`: `/` → `replaceState('/demo-ui')`, plus lazy `DemoUi` and `Participate` pages, each
  connected via `createRoomClient` with its role and showing a `RoomStatusBadge`.

**Acceptance criteria:**
- [ ] `/` lands on `/demo-ui` (criterion 1).
- [ ] Both pages show "connected".
- [ ] `000-template` is untouched.

**Verification:**
- [ ] `pnpm --filter 002-matchmaking build`.
- [ ] `dev` and `preview`: check both routes with `agent-browser`.

**Dependencies:** Checkpoint A
**Files:** `002/{package.json,alchemy.run.ts,vite.config.ts,offline.ts,port.ts,src/App.tsx,src/pages/DemoUi.tsx,src/pages/Participate.tsx,src/room/client.ts,worker/index.ts,worker/MatchRoom.ts}`. Mostly edits to copied template files.
**Scope:** M

### Task 7: Matching engine
**Description:** Add `match(ids, grouping, rng)` in `src/matching/`, with a `random` algorithm file and
a seeded `Rng` helper. Everything here is pure.

**Acceptance criteria:**
- [ ] By size: `floor(n/k)` groups, leftovers spread one per group, and `n<k` gives one group.
- [ ] By count: `min(c,n)` groups, with sizes differing by at most 1.
- [ ] `n=0` gives `[]`. `n=1` gives `[[id]]`. The same seed always gives the same groups.
- [ ] With n=20: k=2 gives 10×2, k=3 gives 4×3 + 2×4, and c=4 gives 4×5 (criterion 3), all as tests.

**Verification:** `pnpm --filter 002-matchmaking test`
**Dependencies:** None (it's pure, so it can start alongside 6)
**Files:** `002/src/matching/{match.ts,match.test.ts,random.ts,rng.ts}`
**Scope:** S

### Task 8: Protocol and room reducer
**Description:**

- `src/room/protocol.ts`: the message types, `MatchConfig`, `ParticipantView` and `RoomSnapshot`, plus
  parsers built on `parseJsonObject`.
- `src/room/matchRoom.ts`: a pure reducer over these events: `join`, `leave`, `ready`, `found`, `config`,
  `start`, `moveOn` and `reset`. Cue assignment is injected.
- Selectors `viewFor(state, id)` and `snapshotOf(state)`.

**Acceptance criteria:**
- [ ] Every phase move is covered by tests:
  - start with 0 ready is rejected
  - join during a round gives `late`
  - a rejoin during a round with a known id keeps its group and cue
  - `found` updates the group's found count for every member
  - `moveOn` and `reset` return everyone to `waiting`
  - a config change mid-round applies next round
  - a leaver is dropped from counts
- [ ] Parsers reject malformed input (tested).

**Verification:** `pnpm --filter 002-matchmaking test`
**Dependencies:** 7
**Files:** `002/src/room/{protocol.ts,protocol.test.ts,matchRoom.ts,matchRoom.test.ts}`
**Scope:** M

### Task 9: `MatchRoom` agent and the colour cue
**Description:**

- Add the `CueType` interface (`assign`, `maxDistinct`, renderer) and the `colour` cue: a 12-entry named
  palette, assigned without repeats, rendered full-screen with its name as text.
- `MatchRoom`:
  - turns `onConnect`, `onClose` and `onMessage` into reducer events
  - calls `setState` with the result
  - sends `view` to each affected participant and `snapshot` to the host (via `sendToRole`)
  - turns off protocol messages, as in `001`

**Acceptance criteria:**
- [ ] Two tabs connected as participants get their views.
- [ ] A host tab gets snapshots after every change.
- [ ] State survives a Worker restart in `dev`.

**Verification:** `colour.assign` test. Manual check with `agent-browser` once Task 10 is done.
**Dependencies:** 6, 8
**Files:** `002/src/cues/{cueTypes.ts,colour/colourCue.ts,colour/colourCue.test.ts,colour/ColourCue.tsx}`, `002/worker/MatchRoom.ts`
**Scope:** M

### Task 10: The participant flow on `/participate`
**Description:** Build the participant screens:

- `StartScreen` from `ui`. The Start tap runs `unlockAudio()`, takes the wake lock and sends `ready`.
- One screen for each view status: `waiting`, `matched` (cue, "found them", "x of N found"), `found`
  ("You're a group of N · x of N found") and `late`.
- The stable id comes from `sessionId('participant')`.

Add a temporary set of host buttons (Start, Move on, Reset) on `/demo-ui` so a round can be driven.
`EmceePane` replaces them in Task 11.

**Acceptance criteria:**
- [ ] One real tab goes through start → waiting → matched (colour) → found, with the right N.
- [ ] Reloading during a round keeps the same colour (criterion 8).
- [ ] A tab that joins during a round sees `late` and is matched in the next round (criterion 7).

**Verification:** Run `agent-browser` with 2–3 participant tabs and 1 host tab. Screenshot each status.
**Dependencies:** 9
**Files:** `002/src/participant/{ParticipantScreens.tsx,…}`, `002/src/pages/Participate.tsx`, `002/src/pages/DemoUi.tsx`
**Scope:** M

### ✅ Checkpoint B: one round, end to end
- [ ] All tests pass, and lint, typecheck and build pass.
- [ ] `dev:lan` on a real phone plus a desktop tab, both as participants, complete a colour round with
  "x of N found" updating live.
- [ ] **Your review** of the reducer, the protocol and how the participant screens feel. Commit.

---

## Phase 3: `matchmaking-demo`

### Task 11: `EmceePane`
**Description:** A mobile-first component (`max-w-sm`) that replaces the temporary buttons. It shows:

- the phase and ready count
- "x of y groups found" with a progress bar, and people found as secondary text
- Start (disabled at 0 ready, with a reason)
- Move on (always enabled in a round)
- Reset
- the current config, read-only

**Acceptance criteria:**
- [ ] Criteria 2 and 6.
- [ ] Progress updates within ~1 s of a `found` (criterion 5).
- [ ] Usable at 375 px wide.

**Verification:** One story or a manual check at 375 px with `agent-browser`. Run a round with 3 tabs.
**Dependencies:** Checkpoint B
**Files:** `002/src/demo/EmceePane.tsx` (+ a small pure `progressOf(snapshot)` with a test), `002/src/pages/DemoUi.tsx`
**Scope:** S–M

### Task 12: Config panels and the join panel
**Description:**

- `ConfigPanels`:
  - algorithm (random)
  - group by size or count, with a number input
  - cue type (colour now, with avatar and birdsong added in Phase 4)
  - a warning when the expected groups exceed the cue's `maxDistinct`
- Sends `config` to the room, and its values come from the snapshot.
- `JoinPanel` uses `JoinQrCode` for `/participate`.
- Lay out the three columns on `/demo-ui`.

**Acceptance criteria:**
- [ ] A config change shows up in `EmceePane` and in the next round's groups.
- [ ] The repeat warning appears before Start (criterion 4).
- [ ] The QR code opens `/participate`.

**Verification:** Unit test for `expectedGroupCount(n, grouping)` (reusing the engine). Manual check with `agent-browser`.
**Dependencies:** 11
**Files:** `002/src/demo/{ConfigPanels.tsx,JoinPanel.tsx,repeatWarning.ts(+test)}`, `002/src/pages/DemoUi.tsx`
**Scope:** M

### Task 13: Simulation module
**Description:**

- `SimulatedParticipant`: a headless `AgentClient` (role `participant`, in-memory id). It sends `ready`
  as soon as it opens. With auto-confirm on, it sends `found` 2–8 s after it is matched. It also has a
  `found()` method for manual use, and `dispose()`.
- `useSimulation()` handles add, remove, set count (0–20) and the auto-confirm toggle.
- Nothing outside `src/simulation/` is imported except `room/protocol.ts` and `room/client.ts` types.

**Acceptance criteria:**
- [ ] With 20 sims, a round makes the right groups (criterion 3, now live).
- [ ] Removing sims mid-round updates the counts (criterion 9).
- [ ] The Worker and `MatchRoom` contain no simulation code (`grep`).

**Verification:** Unit test the auto-confirm delay logic with fake timers. Run `agent-browser` with 20 sims, by size 3.
**Dependencies:** 12
**Files:** `002/src/simulation/{SimulatedParticipant.ts,SimulatedParticipant.test.ts,useSimulation.ts}`, `002/src/hooks/effects/` if an effect is needed
**Scope:** M

### Task 14: Participant cards
**Description:** Add `SimCards`: one card per participant in the snapshot, real or simulated. Each card
shows:

- a name ("Sim 3", or "Phone ab12")
- a status badge
- a small preview of the cue
- the group label
- "found them" on sim cards only
- the simulation controls (count stepper, auto-confirm) above the cards

**Acceptance criteria:**
- [ ] Real and simulated participants appear the same way, apart from the badge and button.
- [ ] Manual "found them" on a sim card updates every view.

**Verification:** `agent-browser`: 12 sims and 1 real tab. Screenshot.
**Dependencies:** 13
**Files:** `002/src/simulation/{SimCards.tsx,SimControls.tsx}`, `002/src/pages/DemoUi.tsx`
**Scope:** S–M

### ✅ Checkpoint C: 20-sim round
- [ ] Criteria 1–9 pass in `agent-browser`, using 20 sims plus 1 participant tab, grouped by size 2, size 3 and count 4.
- [ ] All tests pass, and lint, typecheck and build pass. Commit, and your review.

---

## Phase 4: cues and docs

### Task 15: Avatar cue
**Description:** Add `@dicebear/core` and `@dicebear/collection`, pinned to exact versions. Assign
`{ style, seed }` per group (seeds distinct by construction), render the avatar as a local SVG data URI,
and add it to the config options.

**Acceptance criteria:**
- [ ] Avatars render with the network off (DevTools offline, after the first load).
- [ ] Every group gets a different avatar.

**Verification:** `assign` test. `agent-browser` with network throttled to offline after load.
**Dependencies:** Checkpoint C
**Files:** `002/package.json`, `002/src/cues/avatar/{avatarCue.ts,avatarCue.test.ts,AvatarCue.tsx}`, `002/src/cues/cueTypes.ts`
**Scope:** S

### Task 16: Birdsong cue
**Description:**

- Source about 6 short (≤ 15 s), loop-friendly CC0 or CC-BY clips of distinct species, for example from
  xeno-canto. Re-encode them small (mono, ~64 kbps), put them in `public/birdsong/`, and list source,
  author and licence in `ATTRIBUTION.md`.
- Play the group's species on a loop through the `AudioContext` that the Start tap unlocked, with the
  species name shown on screen.
- Stop playback when leaving `matched` or `found`.

**Acceptance criteria:**
- [ ] Each group hears a different species, and audio plays with no extra tap.
- [ ] The total audio is ≤ ~1 MB.
- [ ] Every file is attributed.

**Verification:** `assign` test. Desktop check with `agent-browser`. **You check criterion 10 on a real iPhone (Safari) and Android phone (Chrome).**
**Dependencies:** Checkpoint C
**Files:** `002/public/birdsong/*`, `002/src/cues/birdsong/{birdsongCue.ts,birdsongCue.test.ts,BirdsongCue.tsx}`, `002/src/hooks/effects/useLoopingSound.ts`
**Scope:** M

### Task 17: Docs
**Description:**

- `002/README.md`:
  - how to run it (dev, LAN, preview)
  - what the demo shows
  - a **Patterns** section: pure reducer + thin Agent, snapshots vs event streams (and when `001`'s
    stream is the better fit), roles via `?role=`, `createRoomClient`, stable ids, and the rule for
    sharing only what two or more examples use
- `packages/common/README.md`: exports and the dependency direction.
- Update `001/README.md` where imports and structure changed.
- Mark the spec as built.

**Acceptance criteria:**
- [ ] Criterion 13.
- [ ] A new reader could build next week's app following the Patterns section.

**Verification:** Read-through. Links resolve.
**Dependencies:** 15, 16 (it can be drafted after Checkpoint B)
**Files:** `002/README.md`, `packages/common/README.md`, `001/README.md`, `docs/specs/matchmaking.md`
**Scope:** S

### ✅ Checkpoint D: complete
- [ ] All 13 success criteria pass (10 on your devices).
- [ ] `pnpm lint && pnpm typecheck`, all tests, and both examples' builds pass.
- [ ] Ready for PR (regular merge commit).
