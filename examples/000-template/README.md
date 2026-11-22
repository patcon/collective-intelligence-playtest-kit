# 000-template

Starting point for new examples. Copy it with `pnpm new-example <name>` from the repo root.

## Stack

- [Kumo](https://www.npmjs.com/package/@cloudflare/kumo) components, styled through Tailwind v4
- Vite + React 19 + TypeScript 7
- React Compiler (Babel preset via `@rolldown/plugin-babel`), so no manual `useMemo`/`useCallback`

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Vite dev server |
| `pnpm build` | Typecheck, then production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | `lint:oxlint` then `lint:complexity` |
| `pnpm lint:oxlint` | Oxlint with `@cloudflare/oxlint-config` plus the rules below |
| `pnpm lint:complexity` | [cccc](https://github.com/moznion/cccc) with limits in `cccc.toml` (downloads a pinned binary to `.tools/` on first run) |

## House rules (enforced by lint)

- **No effects outside `src/hooks/effects/`.** `useEffect`, `useLayoutEffect` and `useInsertionEffect` can't be imported or called as `React.useEffect` anywhere else. When you really need an effect, wrap it in a named hook in that folder (see `useDocumentTitle.ts`). Otherwise derive values during render or do the work in event handlers.
- **No inline comments** (`no-inline-comments`): put comments on their own line.
- **Complexity budget:** max cognitive complexity 15 and max cyclomatic complexity 10 per function.
