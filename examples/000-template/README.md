# 000-template

Starting point for new examples. Copy it with `pnpm new-example <name>` from the repo root.

## Stack

- [Kumo](https://www.npmjs.com/package/@cloudflare/kumo) components, styled through Tailwind v4
- Vite + React 19 + TypeScript 7
- React Compiler (Oxc, via `@vitejs/plugin-react`), so no manual `useMemo`/`useCallback`
- Vite, oxlint and TypeScript config come from [`@playtest-kit/config`](../../packages/config)
- A Cloudflare Worker (`worker/`) answering `/api/*`, with a `Counter` Durable Object behind the page's shared count. Everything else is served as static assets. The Worker typechecks against `@cloudflare/workers-types` through its own `worker/tsconfig.json`, so it can't use browser globals by mistake (and the page can't use Worker ones)
- Works offline once loaded: a service worker (`offline.ts`, via [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)) caches the built app, so a refresh with no network still loads the page; `/api/*` isn't cached. After a deploy, an open page reloads itself onto the new build the next time it's loaded. It's only in builds, so try it with `pnpm preview`, and the dev server removes one a preview left behind on the same port
- Vitest for unit tests (`*.test.ts` next to the code)

## Adding a Durable Object or binding

Declare it in **both** `alchemy.run.ts` (`env`, used by `dev` and deploy) and `previewWorker()` in `vite.config.ts` (used by `preview`), and export its class from `worker/index.ts`. Add new Worker routes to `runWorkerFirst` in both places too, unless they're under `/api/`.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Dev server with the Worker and Durable Objects, via `alchemy dev` (port 1337, from `port.ts`) |
| `pnpm dev:lan` | `dev`, on your LAN over HTTPS (self-signed), so phones can use orientation, motion and wake lock |
| `pnpm build` | Typecheck, then production build |
| `pnpm preview` | Production build with the Worker, served locally in workerd |
| `pnpm preview:lan` | `preview`, on your LAN over HTTPS like `dev:lan` |
| `pnpm test` | Vitest, once |
| `pnpm deploy:setup` | Connect or reauthorise Cloudflare in your Alchemy profile (interactive, once per machine) |
| `pnpm run deploy` | Deploy to Cloudflare Workers with [Alchemy](https://alchemy.run) (`alchemy.run.ts`). Needs `run`: bare `pnpm deploy` is a pnpm built-in |
| `pnpm run destroy` | Delete the deployed Worker for the current stage |
| `pnpm typecheck` | [tsrs](https://github.com/oxc-project/tsrs) (Rust port of TypeScript 7) with `--noEmit --fast`, for the page and then `worker/` |
| `pnpm lint` | `lint:oxlint` then `lint:complexity` |
| `pnpm lint:oxlint` | Oxlint with the shared `@playtest-kit/config/oxlint` (Cloudflare preset plus the rules below) |
| `pnpm lint:complexity` | [cccc](https://github.com/moznion/cccc) with limits in the repo-root `cccc.toml` (downloads a pinned binary to `.tools/` on first run) |

## House rules (enforced by lint)

- **No effects outside `src/hooks/effects/`.** `useEffect`, `useLayoutEffect` and `useInsertionEffect` can't be imported or called as `React.useEffect` anywhere else. When you really need an effect, wrap it in a named hook in that folder (see `useDocumentTitle.ts`). Otherwise derive values during render or do the work in event handlers.
- **No inline comments** (`no-inline-comments`): put comments on their own line.
- **Complexity budget:** max cognitive complexity 15 and max cyclomatic complexity 10 per function.
