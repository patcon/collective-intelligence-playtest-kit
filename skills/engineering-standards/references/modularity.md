# Modularity & File Structure

The goal: anyone (human or agent) can find where something lives by its name, change it
without reading unrelated code, and reuse it elsewhere without copying.

## Project layout

```
packages/ui/          @playtest-kit/ui — shared components, documented in Storybook
  src/
    <Component>/      One folder per component: the component, its subcomponents,
                      pure logic modules, *.test.ts, *.stories.tsx, *.mdx, fixtures/
    hooks/            Shared hooks used by 2+ components
    index.ts          Public surface — the only file examples import
examples/
  000-template/       Starting point copied by `pnpm new-example`
  NNN-<name>/         One Vite app per playtest
    src/
      App.tsx
      components/     UI used only by this app (create when first needed)
      hooks/          Hooks used only by this app
docs/                 Experiments and decisions
skills/               Agent skills (also at .claude/skills)
```

Create folders only when there's something to put in them. Don't scaffold empty trees.

## Where does this code go?

- Renders UI? → a component. Only one example uses it → that example's `src/`.
  A second example needs it → `packages/ui`.
- Holds state, effects, or subscriptions? → a hook.
- Transforms data, makes decisions, parses, formats, validates? → a pure function in its
  own module next to the code that uses it (no React, no I/O).
- Talks to the network? → a hook or module of its own. Reusable components never fetch.

## Promotion rule

Start local. Code moves "up" (example → `packages/ui`) the moment a second example needs
it — not before. Moving it, with a story, is part of the change that introduced the second use.

## Splitting a large component

When a component grows too big, split in this order:

1. **Extract logic** into a hook (`useThing`) — state, effects, derived values.
2. **Extract pure functions** the hook or JSX uses into their own modules.
3. **Extract subcomponents** for distinct visual regions (header, list, item, footer).
4. **Use composition** (children, render props, compound components like Kumo's
   `Dialog.Root` / `Dialog.Trigger`) instead of adding more boolean props.

Signs a split is overdue: boolean props that switch whole branches of JSX, more than ~3
`useState` calls, more than ~6 props, or scrolling to understand one component.

## Composable component design

- Accept `className` and pass it through with Kumo's `cn()` so callers can adjust layout.
- Prefer `children` and slots over configuration props.
- Keep components controlled-or-uncontrolled consistently (`value` + `onValueChange`,
  matching Kumo's conventions).
- Don't fetch inside reusable components — take data as props.

## Imports

- Examples import `@playtest-kit/ui` only via its `index.ts`, never deep paths.
- `packages/ui` never imports from `examples/`, and examples never import each other.
- Pure logic modules never import React or do I/O.
