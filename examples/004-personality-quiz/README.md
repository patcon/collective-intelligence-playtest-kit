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
