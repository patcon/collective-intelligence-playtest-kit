# 000-template

Starting point for new examples. Copy it with `pnpm new-example <name>` from the repo root.

## Stack

- [Kumo](https://www.npmjs.com/package/@cloudflare/kumo) components, styled through Tailwind v4
- Vite + React 19 + TypeScript 7
- React Compiler (Oxc, via `@vitejs/plugin-react`), so no manual `useMemo`/`useCallback`
- Vite, oxlint and TypeScript config come from [`@playtest-kit/config`](../../packages/config)

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Vite dev server |
| `pnpm dev:lan` | Dev server on your LAN over HTTPS (self-signed), so phones can read tilt |
| `pnpm build` | Typecheck, then production build |
| `pnpm preview` | Production build with the Worker, served locally in workerd (rooms work) |
| `pnpm preview:lan` | `preview`, on your LAN over HTTPS like `dev:lan` |
| `pnpm deploy:setup` | Connect or reauthorise Cloudflare in your Alchemy profile (interactive, once per machine) |
| `pnpm run deploy` | Deploy to Cloudflare Workers with [Alchemy](https://alchemy.run) (`alchemy.run.ts`). Needs `run`: bare `pnpm deploy` is a pnpm built-in |
| `pnpm run destroy` | Delete the deployed Worker for the current stage |
| `pnpm typecheck` | [tsrs](https://github.com/oxc-project/tsrs) (Rust port of TypeScript 7) with `--noEmit --fast` |
| `pnpm lint` | `lint:oxlint` then `lint:complexity` |
| `pnpm lint:oxlint` | Oxlint with the shared `@playtest-kit/config/oxlint` (Cloudflare preset plus the rules below) |
| `pnpm lint:complexity` | [cccc](https://github.com/moznion/cccc) with limits in the repo-root `cccc.toml` (downloads a pinned binary to `.tools/` on first run) |

## House rules (enforced by lint)

- **No effects outside `src/hooks/effects/`.** `useEffect`, `useLayoutEffect` and `useInsertionEffect` can't be imported or called as `React.useEffect` anywhere else. When you really need an effect, wrap it in a named hook in that folder (see `useDocumentTitle.ts`). Otherwise derive values during render or do the work in event handlers.
- **No inline comments** (`no-inline-comments`): put comments on their own line.
- **Complexity budget:** max cognitive complexity 15 and max cyclomatic complexity 10 per function.
