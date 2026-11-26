# Spec: GroupSegmentWizard, the emcee's control for dividing the room

_Status: draft (2026-11-26), awaiting review. Intent: [`docs/intent/group-segment-wizard.md`](../intent/group-segment-wizard.md). Builds on [matchmaking](matchmaking.md), whose tech stack, commands, code style and boundaries all still apply._

## Objective

Make the prototyped `GroupSegmentWizard` (the `compact` layout) the real way to set how the room is divided. In the lobby, before tapping Start, the emcee uses it in `EmceePane` to set **groups** or **people per group**. When people per group is set, they also pick a **fit**: Smart, Min or Max. The bar shows exactly the groups Start will make.

Today the prototype keeps its own state while Start reads `/demo`'s Group by select. After this change the wizard's setting *is* the room's grouping: it's shared between hosts, survives a reload, and the matcher deals people into exactly the sizes the bar shows.

**User:** the emcee at an event. `/demo` stays an exploratory harness. Its grouping selects are removed, not kept alongside the wizard.

### User stories

- As the emcee, I set "4 groups". The bar shows how the people ready now split, and Start makes exactly those groups.
- As the emcee, I switch to "people per group". The number starts at the current split, so nothing jumps, and from then on more arrivals make more groups.
- As the emcee, I pick Min at 12 with 17 ready. The bar shows `12·5` with the 5 in orange, and Start stays disabled until 24 are ready, when it makes `12·12`.
- As the emcee, I set things before anyone arrives. Start stays blocked until the people ready can make the split.
- As a second host, or after reloading `/emcee`, I see the same setting.

## Behaviour (the rules the tests pin down)

A grouping is either **by count** *c*, or **by size** *k* with a **fit**. `groupSizes(n, grouping)` gives the sizes, largest first. There are always at least 2 groups, even when *n* = 0 (the bar shows segments of 0).

| Grouping | Groups for *n* ready | Sizes |
|---|---|---|
| count *c* | max(2, *c*) | dealt as evenly as possible (differ by ≤ 1) |
| size *k*, **Smart** (default) | the count whose average is closest to *k*. Ties go to more groups. Never a count that leaves someone alone | even |
| size *k*, **Max** | ⌈*n*/*k*⌉, at least 2 | even |
| size *k*, **Min** | ⌊*n*/*k*⌋, at least 2 | even, **except** with people for only one full group (⌊*n*/*k*⌋ = 1, *n* > *k*): `[k, n − k]` |

Worked examples (each is a test case): 7 at 2 Smart → `3·2·2`. 12 at 3 Smart/Max/Min → `3·3·3·3`. 13 at 3 Max → `3·3·3·2·2`. 13 at 3 Min → `4·3·3·3`. 20 at 15 Min → `15·5`. 32 at 15 Min → `16·16`. 0 at count 3 → `0·0·0`. 3 at count 2 → `2·1`.

**Start is blocked** (the same `startBlocker` runs in the UI and in the room reducer) when any of these holds:
- fewer than 2 are ready
- any group has fewer than 2 people (someone would be alone; this also covers a split into one group, since there are always at least 2)
- there are more groups than the cue's `maxDistinct`. This replaces `repeatWarning`, which used to allow it with a warning.
- under Min *k*, any group has fewer than *k* people. So Min starts only once there are 2*k* ready (24 at Min 12). Its `[k, n − k]` split exists to show how many people are missing, not to be started.

Every blocking condition also turns the groups it applies to orange. Nothing is flagged without blocking.

**Controls** (as prototyped): −/+ stop only at 2 (groups) and 2 (per group), never because of headcount. Numbers are at most two digits. Switching which number is set starts it from the current calculated value.

## Capability map

| Module id | Responsibility | Depends on |
|---|---|---|
| `grouping-model` | `Grouping` gains `fit`. `groupSizes`, `startBlocker` and `groupConcerns` move to `src/matching/`. `match` deals people into chunks of `groupSizes` instead of round-robin. Protocol validation accepts the new shape. | — |
| `room-grouping` | The reducer's `start` uses the shared `startBlocker`. `DEFAULT_CONFIG` grouping becomes size 3, Smart. | `grouping-model` |
| `emcee-control` | The wizard reads its grouping from the room snapshot and sends `config` messages. It graduates out of the prototype folder. Group by and Groups / People per group are removed from `ConfigPanels`. | `room-grouping` |

Build order: `grouping-model` → `room-grouping` → `emcee-control`.

**Why chunks instead of round-robin:** dealing into `groupSizes` makes the bar and the room agree by construction, which is what makes Min (`15·5`) show truthfully how many people are missing. Chunking also suits the algorithm contract better, "ordered so that neighbours suit each other", since neighbours now end up in the same group. With `random` ordering the two deals are statistically the same.

### Shape

```ts
// src/matching/match.ts
export type Fit = 'smart' | 'min' | 'max';
export type Grouping = { by: 'size'; size: number; fit: Fit } | { by: 'count'; count: number };

// src/matching/split.ts (from the prototype's divideMaths.ts)
export function groupSizes(n: number, grouping: Grouping): Array<number>;
/** Why Start would be refused, or null. Shared by EmceePane and the room reducer. */
export function startBlocker(ready: number, grouping: Grouping, maxDistinct: number): string | null;
/** Per group: is it a concern (orange)? Same length as groupSizes. */
export function groupConcerns(sizes: ReadonlyArray<number>, grouping: Grouping, maxDistinct: number): Array<boolean>;
```

`groupCount` and `smallestGroupSize` are replaced by `groupSizes` and deleted. `src/demo/startBlocker.ts` moves into `split.ts`.

### Components

- `src/demo/GroupSegmentWizard/`: the `compact` layout, with **no `layout`/`variant` prop**. Props: `grouping`, `ready`, `maxDistinct`, `onChange(grouping)`. Which number the emcee sets is `grouping.by`, so it isn't kept as separate local state. The only local state is the number not currently being set, remembered while switching. A step or cycle is a pure function, `nextGrouping(grouping, action, ready)`, which is unit tested.
- `src/demo/prototype-group-segment-wizard/`: stays, holding the other prototyped layouts (`groupsOnly`, `modeTabs`, `linkedPair`, `linkedPairWithFit`) behind one `<GroupSegmentWizardVariants layout=… />` component. They are **kept as code, not shown**: nothing in the app renders them. `LayoutSwitcher`, `useLayoutChoice` and the `?variant=` query string are deleted. The variants keep their own `useDivision` and `divideMaths.ts` (with the "aim for / at least" fits, which aren't in the room model) and never touch the room. Parts shared with the real wizard (`CycleTrack`, the bar) move out with it, and the variants import them from there. The folder must still typecheck and lint.

## Testing strategy

Vitest (`pnpm test` in `examples/002-matchmaking`). The tests sit next to the code, as they do now.

- `split.test.ts`: every worked example above, and a table over *n* = 0..20 × count 2..6 and size 2..5 × each fit, checking that sizes sum to *n*, there are at least 2 groups, and the sizes are largest first.
- `match.test.ts`: the group sizes `match` returns equal `groupSizes`. Every id ends up in exactly one group.
- `matchRoom.test.ts`: the reducer refuses Start for each blocker (including 17 ready at Min 12), and 32 ready at Min 15 makes `16·16`.
- `protocol.test.ts`: a `config` whose size grouping has no `fit`, or an unknown `fit`, is rejected.
- `nextGrouping` tests: switching doesn't change the split, and −/+ stop at 2.
- Manual, on `/demo` with simulated participants: set the wizard, reload, and see it kept. Open a second `/emcee` and see it in step. Start, and see the groups match the bar.

## Boundaries

- **Always:** one `startBlocker` for both the UI and the reducer. The bar renders `groupSizes`, never its own maths.
- **Ask first:** new dependencies; changing Algorithm, Cue or Display found count in `ConfigPanels`.
- **Never:** migrations for rooms saved before this change (decided 2026-11-26: not needed); adjusting groups mid-round; warning callouts or text under Start; moving the cue or algorithm pickers to the emcee view.

## Success criteria

1. `/demo`'s config panel has no Group by or Groups / People per group control. Algorithm, Cue and Display found count remain.
2. The wizard's setting is in the room snapshot: kept across a reload, and the same on two host tabs.
3. For every blocker above, the wizard's Start is disabled *and* the reducer ignores a `start` message.
4. After Start, the round's group sizes equal what the bar showed. Under Min with a short group (17 at Min 12, bar `12·5`), Start is disabled and the reducer ignores `start`.
5. `GroupSegmentWizard` has no layout prop, lives outside a `prototype-*` folder, and has no `PROTOTYPE` comments.
6. Nothing in the app renders the other layouts, and `?variant=` does nothing. They are still in `prototype-group-segment-wizard/` and still typecheck.
7. `pnpm test`, `pnpm typecheck` and `pnpm lint` pass. The matchmaking spec's grouping lines (the config panel and matching engine sections) are updated to point here.

## Decisions (resolved 2026-11-26)

- **Min blocks Start** while any group is short of *k*.
- **Variants aren't shown** in the demo UI. They stay as code in `prototype-group-segment-wizard/`, and only the real component moves out.
- **Naming:** standardise on "group segment wizard" (`GroupSegmentWizard`, `group-segment-wizard.md`).
- **No migration** for rooms saved before this change.

## Open questions

None.
