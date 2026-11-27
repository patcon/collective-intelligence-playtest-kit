# 004-quizzes

Quizzes a room answers together, starting with a personality quiz (the IPIP Big-Five Factor Markers). It's
named for quizzes in general because more may follow, to find the right abstractions. The design is in
[`docs/specs/personality-quiz.md`](../../docs/specs/personality-quiz.md).

## Run it

```sh
pnpm install
pnpm --filter 004-quizzes dev    # http://localhost:1337/demo; dev:lan serves it to phones over HTTPS
```

`/` opens `/demo`, the host's page. Phones join at `/participate`. The scaffold is
[`000-template`](../000-template)'s, so its README covers the stack, the scripts and the house rules; this example
adds `pnpm sample:responses` (below) and typechecks and lints `scripts/` too.

## Pages

| Path | Who | What |
| --- | --- | --- |
| `/demo` | The host, on a laptop or a screen | Simulated people (how many, the most they skipped in the real data, speed, fast-forward), the quiz (how many statements, latecomers, Start, Reset), a QR code to join, an info area, and the vote matrix |
| `/participate` | Each phone | Start, then one statement at a time: Disagree … Agree, Skip, and Undo. A reload comes back to the same statement |

There's one room, `demo`. Start picks N of the 50 statements, spread evenly across the five traits, and puts them
in the test's order; everyone answers the same ones. Reset clears every answer. Latecomers either wait for the next
quiz or join at statement 1.

On `/demo`, the vote matrix has a row per person (phones, then this page's sims, then any from another tab) and a
column per statement, coloured from Disagree (red) to Agree (green) as in Polis, with a cross for a skip and a dot for not
answered yet. Hovering or focusing a column number or a row shows that statement or person in the info area above it.

## Code

| Path | What it is |
| --- | --- |
| `src/items/items.ts` | The statements from `ipip-bffm-items.json`, checked at load, with literal `ItemId` and `Trait` types. Used by the page and the Worker |
| `src/room/quizRoom.ts` | The room as a pure reducer over join, leave, ready, answer, undo, config, start and reset |
| `src/room/chooseStatements.ts` | N statements, even across traits, in the test's order |
| `src/room/roomSelectors.ts` | `viewFor` (one participant's screen) and `snapshotOf` (the host's view of the room) |
| `src/room/protocol.ts` | Socket messages, validated at the boundary by `parse*` functions. Messages carry statement ids, never text |
| `src/room/throttle.ts` | `Throttle`: at most one send per 250 ms window, at once for urgent changes |
| `src/participant/` | `/participate`'s screens: waiting, answering, done |
| `src/demo/` | `/demo`'s panels: quiz controls, join, info area, vote matrix and its legend |
| `src/simulation/` | Headless participants (`QuizSim`, `QuizCrowd`, `useSimulation`) on their own sockets, built on `@playtest-kit/common/simulation`. Lint lets it import only the protocol, the statements and the sources, so it can only do what a phone can |
| `worker/QuizRoom.ts` | Thin `Agent`: socket events in, state in memory and saved throttled, views and snapshots out |

## Patterns

### A pure reducer and a thin Agent, as in `002`

All the room's rules are `reduce(state, event, rng)` and its tests. `QuizRoom` only turns socket events into
reducer events and sends the results.

### Throttled snapshots and saves

With 200 sims at ×20, the room takes 600+ answers a second. So:

- **Each participant** hears about a change to them at once (everyone, for Start, Reset and config).
- **The host** gets a full snapshot at most every 250 ms, but at once for a phase change or its own config change.
- **The room's state** is kept in memory and saved with `setState` at most every 250 ms, at once for a phase change.
  Saving on every answer capped the room at about 330 answers a second; at worst, a crash now loses 250 ms of answers.

### Simulated participants are real people from the sample

Each sim is one person from `ipip-ffm-responses.json`, drawn without repeats, and gives that person's answers (and
skips) after 3–9 s per statement, divided by the speed. They speak the same protocol as a phone, over their own
sockets, so whatever works for 200 sims works for 200 phones.

Browsers cap open WebSockets: Firefox allows 200 across all its tabs, so a `/demo` page gets about 197 sims there,
and fewer with other tabs open. Chrome opens them one handshake at a time. A sim whose socket hasn't opened within
10 s counts as unable to connect, and the simulation panel says how many and why; they keep trying.

## Sources

| Path | What it is |
| --- | --- |
| `sources/ipip-bffm-items.json` | The 50 statements of the [IPIP Big-Five Factor Markers test](https://openpsychometrics.org/tests/IPIP-BFFM/) on Open-Source Psychometrics, with its five-point answer scale (Disagree … Agree) |

Each item has the site's own `id` (`EXT1` … `OPN10`), its `order` in the test (the five traits take turns), its
`factor` (Extraversion, Agreeableness, Conscientiousness, Emotional stability or Openness), whether it's `keyed`
for (`1`) or against (`-1`) that trait, and its `text`, verbatim.

The items are Goldberg's (1992) [IPIP 50-item set](https://ipip.ori.org/new_ipip-50-item-scale.htm), which is in the
public domain. They were taken from the script on the test's question page, the one "Begin assessment" opens.

### Responses

`sources/ipip-ffm-responses.json` is a sample of 1,000 real answer sets to those items, for simulated participants.
It comes from the [IPIP-FFM raw data](https://openpsychometrics.org/_rawdata/) (`IPIP-FFM-data-8Nov2018.zip`):
about 1M people who took the test in 2016–2018 and agreed to their answers being used for research. The full
dataset is 151 MB zipped, so only the sample is committed.

Each response is a `country` (guessed by the site from the person's IP, `NONE` when it couldn't tell) and 50
`answers`, 1–5, in the order of the file's `items`, with `null` where the person skipped an item. Everyone in the
dataset finished the test, but about 14% skipped at least one item, mostly just one or two. Those people are kept, so
the sample shows what partial data looks like; only the ~3,900 who answered nothing are left out. Nor is it limited to
one record per IP address (the codebook's `IPC` 1), so a few people may appear twice. The dataset's per-item timings,
screen sizes and approximate locations are left out.

To make the sample again, or a different size:

```sh
pnpm sample:responses [size]   # default 1000; needs unzip
```

The script downloads the zip once into `.cache/` (gitignored), streams the CSV out of it, and samples with a
fixed seed, so the same size gives the same people.
