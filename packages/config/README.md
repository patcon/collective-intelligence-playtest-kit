# @playtest-kit/config

Shared tooling config for `packages/*` and `examples/*`, so a rule changes in one place.

| Export | Use it from |
| --- | --- |
| `@playtest-kit/config/oxlint` | `oxlint.config.ts`: `export { default } from '@playtest-kit/config/oxlint';` |
| `@playtest-kit/config/vite` | `vite.config.ts`: `export { default } from '@playtest-kit/config/vite';` (React Compiler via Oxc, Tailwind) |
| `@playtest-kit/config/tsconfig.json` | `tsconfig.json`: `"extends": "@playtest-kit/config/tsconfig.json"` |

The `cccc` complexity budget lives in the repo-root `cccc.toml`, which `cccc` finds by walking up.
