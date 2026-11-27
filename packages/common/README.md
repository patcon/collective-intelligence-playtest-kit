# @playtest-kit/common

Non-visual code shared by more than one example: the room connection, effect hooks, and helpers for
the Worker. Visual components live in [`@playtest-kit/ui`](../ui), which may depend on this package;
this package never depends on `ui`.

Published as TypeScript source (no build step), like `ui`.

| Export | For |
| --- | --- |
| `@playtest-kit/common` | Browser code |
| `@playtest-kit/common/server` | Worker and Durable Object code (no React, no DOM) |
| `@playtest-kit/common/simulation` | Simulated participants on a demo page (browser only; kept apart so a Worker never imports `agents/client`) |

## What's here

| Name | What it does |
| --- | --- |
| `parseJsonObject(raw)` | Socket text as a JSON object, or `null`. Assign it to an interface of `unknown` fields, then validate them. |
| `createRoomClient<In, Out>({ agent, parse })` | A typed `RoomProvider` (room, role, optional fixed `id`, `closeWhenHidden`) and `useRoomMessages`, `useRoomSend`, `useRoomStatus`, `useSendOnOpen` for one Agent and protocol. Call it once per example, at module level. |
| `sessionId(key)` | A per-tab id kept in `sessionStorage`, so a reload rejoins as the same connection. |
| `socketProtocol()` | `wss` on an HTTPS page, else `ws`: for sockets to a room not made with `createRoomClient`. |
| `useDisposeOnUnmount`, `useInterval`, `useOnChange`, `usePageVisibility`, `useWakeLock` | Effect hooks, each in `src/hooks/effects/` (the only place lint allows effects). |
| `unlockAudio()`, `unlockedAudio()` | Resume the page's `AudioContext` from a tap, so sound can play later without one. |
| `newSimId`, `isSimId`, `straySimIds` (`/simulation`) | Mark sim ids so any page can tell them from phones, and find sims in a room that this page didn't make. |
| `connectToRoom(agent, room)`, `SimSocket`, `ConnectSim` (`/simulation`) | Open a headless participant socket to a room, for a sim. |
| `randomDelay(minMs, maxMs)` (`/simulation`) | A uniform random wait, for a sim's pauses. |
| `SimCrowd`, `useSimCrowd` (`/simulation`) | A store of sims built by a factory, kept within a limit, newest out first, named "Sim 1"… by position; and a hook that owns a crowd for a component's life. What a sim does, and crowd-wide settings, stay in each example. |
| `roleFromUrl`, `roleOf`, `sendToRole` (`/server`) | Read a connection's role from `?role=` and its tags; send JSON to every connection with a role. |

Only move something here once a second example needs it.
