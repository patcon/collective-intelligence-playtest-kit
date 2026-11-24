# Plan: Valence remote

_Updated 2026-11-24. Status: agreed, ready to build. This doc stands alone: the session that wrote it is cleared._

## Goal

A phone component that turns orientation into a 1D valence signal (−1 to +1), and an example,
`examples/valence-remote`, that shows what one or more phones send to a room on the Cloudflare
Agents SDK over websockets. Someone scans a QR code, taps once, and their phone is a remote.

## Decisions already made

- **Smallest core first.** Everything else is listed under [Future work](#future-work).
- **Agents SDK, not PartyKit,** for the room.
- **Everything lives in the example for now:** the hook, the component, the provider and the agent.
  When a second example needs them, extract them into `packages/common`. Lay out folders so that
  move is clean.
- **No Storybook stories and no trace recording yet.** The example itself is the demo.
- **Calibration (set high/low/reset) is deferred.** Detection is fixed per page via a prop.
  See [Calibration](#calibration) under future work.

## Before starting (repo conventions)

- Read `skills/engineering-standards/` (required by `AGENTS.md`).
- House rules, enforced by lint (see `examples/000-template/README.md`):
  - `useEffect` only in `src/hooks/effects/`, as named hooks;
  - no inline comments;
  - cognitive complexity ≤ 15, cyclomatic ≤ 10;
  - React Compiler is on, so don't write `useMemo` or `useCallback` by hand.
- Use `pnpm` only. Use Kumo components for UI.
- **Agents SDK:** use the `agents-sdk` skill and fetch the current docs; don't trust memory.
  Don't enable `experimentalDecorators`. Each Agent class needs a DO binding and a `new_sqlite_classes` migration.
- **Browser checks:** use `agent-browser`, run as `mise exec node@24.16.0 -- agent-browser`
  (mise has no global Node). Not the Claude in Chrome extension, which isn't working.
  Ask Patrick before running Playwright directly, and don't fetch tools with `pnpm dlx`.

## Now: the smallest core

### Layout: `examples/valence-remote/`

```
src/
  hooks/effects/useWakeLock.ts        # 1
  hooks/effects/useDeviceOrientation.ts
  hooks/effects/useRoomMessages.ts
  ValenceRemote/                      # 2
    ValenceRemote.tsx
    lib/valence.ts (+ valence.test.ts)
    lib/sender.ts                     # throttle + keepalive
  room/                               # 3
    RoomProvider.tsx
    protocol.ts                       # RoomMessage union
  pages/Remote.tsx  pages/Viewer.tsx
worker/
  index.ts                            # routeAgentRequest
  ValenceRoom.ts
```

Create it with `pnpm new-example valence-remote` (copies `000-template`).

### 1. `useWakeLock`

```ts
useWakeLock(active: boolean): { supported: boolean; acquired: boolean }
```

Based on `~/repos/polislike-partykit-reaction-canvas/app/utils/useWakeLock.ts`. Also take the
lock again on `visibilitychange` back to visible, since browsers drop it when a tab is hidden.

### 2. `ValenceRemote`

Looks like the remote in `~/repos/dimensional-reduction-exploration/v6-0/web/src/remote/Remote.tsx`:
a full-screen fill in the valence colour, −1/+1 labels, a one-line instruction, and a
"Tap to start" button. The button is the user gesture iOS needs before `requestPermission`.

```ts
interface ValenceRemoteProps {
  /** Throttled (~50 ms, epsilon 0.004) with a 1 s keepalive; null when it can't tell. */
  onValence: (valence: number | null) => void;
  /** On mount and on change: 'arrived' (on the start screen), 'active', or 'idle'. */
  onActivity?: (activity: 'arrived' | 'active' | 'idle') => void;
  detection?: 'flip' | 'invert' | 'spin' | 'touch';   // default 'flip'
  keepAwake?: boolean;                                 // default true, via useWakeLock
}
```

- **`lib/valence.ts`:** port v6.0's `valence.ts` almost as is (`upOf`, `detected`, `touchValence`,
  `SPIN_FLAT`), without the setpoint and calibration functions. Add a few unit tests: face up is +1,
  face down is −1, edge on is 0, spin near flat is null, touch at the top and bottom.
- **`lib/activity.ts`:** tells active from idle. Tilt is idle once the phone stays within
  `STILL_DEG` (2°) of where it was for `IDLE_MS` (3 s), as when it's put down; touch is active
  while a finger is on the screen and idle as soon as it lifts. `hooks/useActivity.ts` reports it.
- **`lib/sender.ts`:** v6.0's `SEND_MS` / `SEND_EPSILON` / `KEEPALIVE_MS` logic as a small pure helper.
- **The orientation listener and permission flow** go in `hooks/effects/useDeviceOrientation.ts`.
  It covers:
  - `window.isSecureContext` (Chrome blocks orientation on HTTP);
  - iOS `DeviceOrientationEvent.requestPermission`;
  - unsupported browsers;
  - no events within about 2.5 s.

  Statuses: `needs-permission | denied | insecure | unsupported | no-signal | live`.
- **Touch mode** reads the finger's height (top +1, bottom −1) and holds where it was last.
  It doubles as the desktop fallback, so desktop tabs can act as phones.

### 3. A simple room provider and agent

**Protocol (`room/protocol.ts`):**
```ts
type RoomMessage =
  | { type: 'valence'; v: number | null }                    // phone → room
  | { type: 'valence'; id: string; v: number | null; t: number } // room → viewers
  | { type: 'activity'; activity: Activity }               // phone → room, on change and on (re)connect
  | { type: 'activity'; id: string; activity: Activity }   // room → viewers
  | { type: 'joined'; id: string; role: Role }
  | { type: 'left'; id: string };
type Role = 'phone' | 'viewer';
```

**Provider (`room/RoomProvider.tsx`):**
```tsx
<RoomProvider room="demo" role="phone">…</RoomProvider>
useRoomSend(): (msg: RoomMessage) => void
useRoomMessages(cb: (msg: RoomMessage) => void): void   // effect in hooks/effects/
useRoomStatus(): 'connecting' | 'open' | 'closed'
```
- It wraps `useAgent({ agent: 'ValenceRoom', name: room, query: { role } })`, using its raw
  `send` and `onMessage`, so messages are JSON.
- Components below it get the room from context, so neither page needs transport props.
- A phone closes its socket while its page is hidden (`visibilitychange`, `pagehide`), so the
  room sends `left` at once, and reconnects with the same id when the page is visible again.
  Sends while the socket isn't open are dropped rather than queued.
- Subscribers sit behind a ref that always holds the latest callback, the same pattern as
  reaction-canvas's `RoomSocketContext.tsx`.

**Agent (`worker/ValenceRoom.ts`):** `ValenceRoom extends Agent`.
- `getConnectionTags` reads `?role=` and tags the connection `phone` or `viewer`.
- `onConnect` and `onClose` send `joined` / `left` to viewers.
- `onMessage` passes a phone's `valence` on to viewers, adding the phone's connection id and a timestamp,
  and its `activity` with the id.
- No synced state, no persistence and no batching yet.

**Wiring:** `worker/index.ts` with `routeAgentRequest`, plus the DO binding and migration.
- **Check this first, before building anything else:** can the template's Alchemy setup
  (`Website.Vite` in `alchemy.run.ts`) attach a Worker entry with a Durable Object binding, and
  run it locally with `alchemy dev`? If not, use `@cloudflare/vite-plugin` for local dev and keep
  Alchemy for deploy. Record what worked in the example README.

### 4. Pages

- **`/remote`:** `RoomProvider role="phone"` → `ValenceRemote onValence={(v) => send({ type: 'valence', v })}`,
  with `onActivity` kept in state and sent by `useSendOnOpen`, which resends it on every reconnect.
  A `?detection=` query parameter picks the mode (default `flip`; desktop tabs use `touch`).
- **`/` (viewer):** `RoomProvider role="viewer"`, built with Kumo components:
  - a table with one row per connected phone: id, current valence with a meter, activity (arrived, active or idle) as a badge, and messages per second;
  - a scrolling log of the last ~50 raw messages, to show what's being sent;
  - a link and QR code to `/remote`, with the QR from `uqr`, as dimensional-reduction used.
- **Phones on the LAN:** `vite --host` with HTTPS (`@vitejs/plugin-basic-ssl`, or whatever the
  local-dev route supports), since orientation needs a secure page.

### Done when

- In local dev, open `/` plus two `/remote?detection=touch` tabs. Dragging in each moves its own row live through the agent, and closing a tab removes its row.
- A real phone on the LAN (HTTPS, permission granted) appears on the viewer and moves its row as it's flipped. _Needs Patrick with a phone._
- `pnpm lint`, `pnpm typecheck` and the unit tests pass in the example.
- The example README says how to run it locally, on a phone, and deployed.

---

## Future work

### Extract into `packages/common` (when a second example needs them)
- `useWakeLock`, `useDeviceOrientation`, `ValenceRemote`, `RoomProvider`, the protocol and the agent, plus a `JoinQRCode` component.
- Add Storybook stories then (`Default` in touch mode, `Flip`) with play tests and an `.mdx`.

### Calibration
- Set high, set low and reset per phone, using v6.0's setpoint maths (`calibrated`, `valenceOf` between setpoints, `MIN_TURN`, including `44713f0`'s fix for setpoints near opposite ends), and `touchCalibrated` for touch.
- Saved per detection in `localStorage`, across reloads.
- Triggered from the phone (buttons) or from the viewer (a `calibrate` message sent to every phone in the room), or both.

### Signal quality
- Mine the v4.0→v6.0 history of `*/remote/*` in dimensional-reduction-exploration (`8187a77`, `4ad2476`, `9b2af0c`, `5a2b6d0`, `44713f0`, `99ce03f`) for behaviours and fixes, and turn them into tests.
- A trace recorder (raw `deviceorientation` and `devicemotion`) and fixtures from iOS and Android.
- Property tests (fast-check) and a parity test against the old `valence.ts` on recorded traces.
- Experiments, each settled by measurement:
  - beta/gamma vs the `devicemotion` gravity vector;
  - smoothing (none / EMA / One Euro);
  - the send throttle and epsilon;
  - whether Wake Lock and orientation lock help.
- Real-device checks: iOS and Android agree within a tolerance; a target-hitting test with someone new to it.

### Component
- An `OrientationSource` interface (device, simulated, replay) and a `source` prop.
- Gradients, an instructions prop, a calibration UI, `storageKey`, and an imperative `calibrate` ref.
- A public `useOrientationValence` hook. A Wake Lock indicator toggle, as reaction-canvas's `WakeLockIndicatorButton` does.

### Room: transport-agnostic
- A `RoomTransport` interface so `RoomProvider` isn't tied to `useAgent`, with an in-memory `memoryRoom()` for stories and tests.
  - This avoids reaction-canvas's approach of mocking by module alias, where `send` does nothing and providers aren't connected to each other.
- A pure `createValenceRoom()` core (join, message, leave, tick, batching, silence timeout) shared by the Agent and `memoryRoom`.
- A prop-free `<RoomValenceRemote />`; compute-on-read `useRoomValences()` for hosts (like reaction-canvas's `useValenceStream`).
- A story with one host and N phones on one page; a seeded simulated crowd (reaction-canvas's `app/lib/simulation/` program/engine/sink).

### Room on the Agents SDK: hardening
- Batch valences to viewers on a tick, and drop phones that go silent.
- Room settings (detection, gradient, labels) in synced Agent `state`. Keep high-rate valence off `setState`.
- `connection.setState` for each phone's last reading, so it survives hibernation.
- To verify: how `getConnections(tag)` filters; whether the tick should be an alarm or an in-memory timer.
- Load test with k6 at 50 / 100 / 200 phones (reaction-canvas has `perf/load-test-k6.js`).
- ADR: rooms on the Agents SDK rather than PartyKit.

### Later / maybe
- Host visuals (a crowd strip or histogram, reaction-canvas's `ValenceViz` / cross-section).
- Haptics; more input modes (a slider for desktop, microphone level).
- Run at a playtest, and record traces from participants (with consent).

## Sources

- `~/repos/dimensional-reduction-exploration/v6-0/web/src/remote/`: `valence.ts` (maths), `Remote.tsx` (permission, send throttle, UI), `../protocol.ts`.
- `~/repos/polislike-partykit-reaction-canvas`:
  - `app/contexts/RoomSocketContext.tsx` (the provider pattern);
  - `app/utils/useWakeLock.ts`;
  - `app/components/apps/ReactionCanvasAppV4.tsx` (around lines 290–380: `isSecureContext` and the permission flow);
  - `app/hooks/useValenceStream.ts`;
  - `app/lib/simulation/`.
- Agents SDK docs: https://developers.cloudflare.com/agents/ (Client SDK and WebSockets pages).
