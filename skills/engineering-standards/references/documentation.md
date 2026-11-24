# Documentation Hygiene

Docs are part of the product. Out-of-date docs are worse than none, so every change keeps
them true.

## What lives where

| Doc | Purpose | Update when |
|---|---|---|
| `README.md` | What this is, how to run, build, test, deploy | Setup, scripts, env vars, or stack change |
| `AGENTS.md` | How agents should work in this repo; points to skills | Conventions or skills change |
| `docs/` | Vision, architecture, roadmap, specs for larger features | Architecture or plan changes |
| `docs/experiments/` | Write-ups of spikes and probes, with their evidence | An experiment is run |
| Storybook docs (`*.mdx`) | How to use a `packages/ui` component | Its props or behavior change |
| `docs/decisions/` | ADRs: one short file per significant decision | A real decision with trade-offs is made |
| Code comments | The *why* behind non-obvious code | The code they describe changes |

## Writing docs

- Lead with what the reader needs: what it is, then how to use it, then details.
- Keep it short and specific. Use real commands, real paths, and real names.
- Prefer a small diagram or table over long prose when describing structure or flow.
- Date roadmap and status docs so readers know how fresh they are.
- Link to the source of truth instead of copying it (e.g. link a config file, don't
  paste it). Don't restate what lint already enforces.

## ADRs (architecture decision records)

Write one when choosing between real alternatives that would be costly to reverse
(a rendering library, a storage model, a deploy target). File name:
`docs/decisions/NNNN-short-title.md`. Contents, each a few lines:

1. **Context** — the problem and constraints.
2. **Decision** — what we chose.
3. **Alternatives** — what else we considered and why not.
4. **Consequences** — what this makes easier and harder.

Never edit an accepted ADR's decision; supersede it with a new one that links back.

## Code comments

- Comment *why*, not *what*. If a comment explains what code does, rename things instead.
- Every exported function, hook, and component in `packages/ui` gets a one-line TSDoc
  summary. Add
  `@param`/`@returns` only when they're not obvious from the types.
- Mark deliberate workarounds with the reason and, when there is one, the upstream issue link.
- Delete comments that no longer match the code.

## Doc check for every change

Ask: would someone reading the docs tomorrow be misled by this change? If yes, update them
in the same change.
