# 004-personality-quiz

A personality quiz. Not scaffolded yet: so far this is only its source material.

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
`answers`, 1–5, in the order of the file's `items`. Only clean rows are sampled: the one record from its IP
address (`IPC` 1, as the dataset's codebook advises) with every item answered, about 600k of the 1M. The
dataset's per-item timings, screen sizes and approximate locations are left out.

To make the sample again, or a different size:

```sh
node scripts/sample-responses.ts [size]   # default 1000; needs unzip
```

The script downloads the zip once into `.cache/` (gitignored), streams the CSV out of it, and samples with a
fixed seed, so the same size gives the same people.
