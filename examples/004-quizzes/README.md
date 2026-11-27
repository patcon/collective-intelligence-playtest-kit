# 004-quizzes

Quizzes a room answers together, starting with a personality quiz (the IPIP Big-Five Factor Markers). It's
named for quizzes in general because more may follow, to find the right abstractions. Not scaffolded yet: so far
this is only the personality quiz's source material. The design is in
[`docs/specs/personality-quiz.md`](../../docs/specs/personality-quiz.md).

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
node scripts/sample-responses.ts [size]   # default 1000; needs unzip
```

The script downloads the zip once into `.cache/` (gitignored), streams the CSV out of it, and samples with a
fixed seed, so the same size gives the same people.
