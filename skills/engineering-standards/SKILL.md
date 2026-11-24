---
name: engineering-standards
description: Production-quality standards for the Collective Intelligence Playtest Kit — modular file structure, code quality, documentation hygiene, and when (and how) to write tests. Use before writing or changing any code, adding a feature, refactoring, reviewing a change, or deciding whether something needs a test or a doc update.
---

# Engineering Standards

Adapted from [Brayden/intent-ui](https://github.com/Brayden/intent-ui/tree/main/skills/engineering-standards).

This is a pnpm monorepo: shared React 19 + TypeScript + Kumo components in `packages/ui`,
and one Vite app per playtest in `examples/`. Every change should leave the code easier to
read, change, and reuse than it was before.

Lint (`pnpm lint`: oxlint + the `cccc` complexity budget) enforces many rules mechanically.
This skill covers only what lint can't check.

Read the reference file that matches what you're doing:

| Doing this | Read |
|---|---|
| Adding a feature, creating files, splitting something up | `references/modularity.md` |
| Deciding whether to test, or writing a test | `references/testing.md` |
| Writing a README, doc, comment, or ADR | `references/documentation.md` |

## Core principles

1. **Small, focused units.** One component, hook, or module does one job. Aim for files
   under ~150 lines and components under ~100; crossing that means look for a split.
2. **Compose, don't duplicate.** Build features out of reusable components, hooks, and
   pure functions. The second time you write something, extract it.
3. **Logic lives outside the view.** Components render; hooks manage state and effects;
   pure functions hold business logic. Pure logic is what's easy to test and reuse.
4. **Types are the contract.** Strict TypeScript, no `any`, no non-null `!` without a
   comment explaining why it's safe. Validate data at boundaries (network, storage,
   LLM output, URL params).
5. **Use the platform and the library.** Reach for Kumo components and semantic tokens
   before writing custom UI or raw Tailwind colors.
6. **Test what can break in ways that matter.** Not everything gets a test — see
   `references/testing.md`.
7. **Docs change with the code.** A change that alters behavior, setup, or architecture
   updates the matching doc in the same change.

## Code quality rules

- **Naming:** components `PascalCase`, hooks `useCamelCase`, everything else `camelCase`;
  files match their main export. Names say what a thing is or does — no `utils.ts`,
  `helpers.ts`, `misc.ts`, or `data2`.
- **Exports:** named exports, except where a tool requires a default (`App.tsx`, story
  `meta`, config files). `packages/ui` exposes its public surface through `src/index.ts`.
- **Memoization:** React Compiler handles it. Don't add `useMemo`/`useCallback`/`memo`
  by hand without a measured reason.
- **Errors:** never swallow. Handle where you can recover, otherwise let it propagate to
  an error boundary.
- **Async UI:** every data-driven view handles loading, empty, and error states (Kumo
  has `Loader`, `Empty`, `Banner`).
- **No dead code:** remove unused exports, commented-out blocks, and stale TODOs. A TODO
  must say what and why.
- **Dependencies:** add one only if it saves real effort and is maintained. Say why in the
  change summary. Prefer what's already installed. Pin exact versions.
- **Accessibility:** interactive elements are real buttons/links with labels; Kumo's
  primitives handle focus and ARIA — don't rebuild them.
- **Secrets:** never in source. Use `.env` locally (gitignored).

## Before calling a change done

Run in each package you touched. Fix anything that fails before reporting the work as finished.

- [ ] `pnpm lint` and `pnpm typecheck` pass.
- [ ] `packages/ui`: `pnpm test:unit` and `pnpm test:stories` pass. Examples: `pnpm build` succeeds.
- [ ] New logic that meets the bar in `references/testing.md` has a test.
- [ ] No duplicated logic that should be a shared component, hook, or function.
- [ ] Docs updated if behavior, setup, architecture, or a public interface changed.

When summarizing a change, list: what changed, files added/split, tests added (or why none
were needed), and docs touched.
