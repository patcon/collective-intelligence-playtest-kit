# Testing

Tests exist to catch regressions in behavior that matters and to make refactoring safe.
They are not a coverage target. A test that only restates the implementation is a cost,
not a benefit.

## Decide: does this need a test?

**Write a test when the code:**

- Contains real logic: parsing, validation, transformation, state machines, reducers,
  easing/tweening, merging, diffing, scoring, retries.
- Sits at a boundary that's easy to break silently: schemas for external or LLM-produced
  data, serialization, network adapters.
- Fixed a bug — add a test that would have caught it.
- Is a shared/reusable unit other code depends on (anything in `packages/ui`).
- Has edge cases you had to think hard about (empty input, partial streams, unicode,
  time zones, concurrency).

**Skip the test when the code:**

- Is pure layout or styling, or a thin wrapper that just passes props to a Kumo component.
- Is configuration, constants, or type declarations.
- Is a prototype or spike that's explicitly throwaway (say so in the summary).
- Would only be tested by mocking everything it does — test the logic it calls instead.

When skipping, say in the change summary why no test was needed.

## Tooling

`packages/ui` uses Vitest with two projects:

- **`pnpm test:unit`** — `*.test.ts` files, run in Node. For pure logic and hooks.
- **`pnpm test:stories`** — every story runs in a real browser (Storybook's Vitest
  addon). Interaction checks go in the story's `play` function.

Examples have no test runner; logic worth testing usually belongs in `packages/ui`.

## Writing good tests

- **Test behavior, not implementation.** Assert on outputs, rendered text, returned
  values — not on internal state or which private function got called.
- **Co-locate:** `layoutTween.ts` → `layoutTween.test.ts` in the same folder.
- **Name by behavior:** `it("rejects points without an id")`, not `it("works")`.
- **One reason to fail per test.** Arrange / act / assert, clearly separated.
- **Table-driven** (`it.each`) for many input → output cases.
- **Minimal mocking.** Mock only the network edge or nondeterminism (time, randomness,
  LLM calls). Prefer real implementations and in-memory fakes.
- **Fixtures** live in a `fixtures/` folder next to the code that uses them. Keep them
  small and readable.
- **Deterministic.** No reliance on real time, network, or test order.
- **Fast.** A unit test that takes more than ~100ms is probably testing too much.

## UI tests

Every component gets stories; a story with a `play` function is the UI test. Write one
when a component has interaction logic a unit test can't cover (keyboard flows, conditional
rendering driven by user input). Query by role and label (`getByRole`), never by class name.
