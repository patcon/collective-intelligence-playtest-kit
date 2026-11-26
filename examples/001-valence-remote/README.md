# 001-valence-remote

Phones as valence remotes. Each phone reads how its holder feels, from −1 to +1, by tilt, flip or
touch, and streams it to a room. A viewer page shows every phone live. Built on the shared room
pieces in [`@playtest-kit/common`](../../packages/common) and [`@playtest-kit/ui`](../../packages/ui).

## Pages

- `/` redirects to `/demo`.
- `/demo`: the viewer. A row per phone with its live valence and activity, the raw message log, and a QR
  code to `/participate`, whose settings (detection, labels, resolution and so on) the viewer sets for every phone.
- `/participate`: this device as a remote. Start screen (motion and audio permission, wake lock), then the
  valence bar. Its URL parameters are listed on `Remote` in `src/pages/Remote.tsx`.
- `/remote`, its old address, redirects to `/participate`, keeping its URL parameters.

## Layout

| Path | What it is |
| --- | --- |
| `src/ValenceRemote/` | The remote itself: reading tilt, flip and touch, levels, activity, and its screens |
| `src/room/protocol.ts` | Socket messages, validated at the boundary |
| `src/room/phoneState.ts` | What the room keeps on each phone's connection, so a viewer that joins later catches up |
| `src/room/client.ts` | The room's provider and hooks, from `createRoomClient` |
| `src/viewer/` | The viewer's table, log, QR code and settings |
| `worker/ValenceRoom.ts` | The Agent: passes phones' messages on to viewers, keeps the settings |

The room connection, effect hooks (`usePageVisibility`, `useWakeLock`, `useInterval`, `useOnChange`),
`unlockAudio`, and the Worker's role helpers come from `@playtest-kit/common`. `StartScreen`,
`JoinQrCode` and `RoomStatusBadge` come from `@playtest-kit/ui`.

The room streams events (`joined`, `valence`, `activity`, `left`) rather than sending snapshots, since
phones send valence many times a second. See the Patterns section of
[`002-matchmaking`'s README](../002-matchmaking/README.md#patterns) for when each fits.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Dev server with the Worker and `ValenceRoom`, via `alchemy dev` (port 1337, from `port.ts`) |
| `pnpm dev:lan` | `dev`, on your LAN over HTTPS (self-signed), so phones can read tilt |
| `pnpm build` | Typecheck, then production build |
| `pnpm preview` | Production build with the Worker, served locally in workerd (rooms work) |
| `pnpm preview:lan` | `preview`, on your LAN over HTTPS like `dev:lan` |
| `pnpm test` | Vitest, once |
| `pnpm typecheck` | [tsrs](https://github.com/oxc-project/tsrs) (Rust port of TypeScript 7) with `--noEmit --fast` |
| `pnpm lint` | Oxlint, then the `cccc` complexity budget |
| `pnpm deploy:setup` | Connect or reauthorise Cloudflare in your Alchemy profile (interactive, once per machine) |
| `pnpm run deploy` / `pnpm run destroy` | Deploy or delete with [Alchemy](https://alchemy.run) (`alchemy.run.ts`). Needs `run`: bare `pnpm deploy` is a pnpm built-in |

The house rules in [`000-template`'s README](../000-template/README.md#house-rules-enforced-by-lint) apply.
Ideas not yet built are in [`TODO.md`](TODO.md).
