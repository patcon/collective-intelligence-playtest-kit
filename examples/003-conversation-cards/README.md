# 003-conversation-cards

A stateless card service for drawing conversation cards, plus a minimal page that uses it. The deck is
The And, Self edition. Built from [`000-template`](../000-template). The design is in
[issue #1](https://github.com/patcon/collective-intelligence-playtest-kit/issues/1), the vocabulary
(card, deck, card type, glyph, pool, draw, seen cards, printed look) in [`GLOSSARY.md`](../../GLOSSARY.md),
and the decisions in [`docs/decisions/`](../../docs/decisions) 0001–0003.

## The card service

`worker/cards/` is self-contained (it imports nothing from the rest of the example) so it can move to
`@playtest-kit/common` once a second app needs it. A Worker mounts it with one line, passing in its deck:

```ts
return (await routeCardsRequest(request, deck)) ?? new Response('Not found', { status: 404 });
```

| Request | Response |
| --- | --- |
| `GET /api/cards?type=&ids=&exclude=` | `{ cards, meta: { pool, total } }`: every card in the pool, in deck order |
| `GET /api/cards/random?type=&ids=&exclude=&limit=` | `{ cards, meta: { pool, total } }`: up to `limit` (default 1) cards drawn at random, no repeats |
| `GET /api/cards/:cardId` | `{ card }`, or `404 { error: "not found" }` |

- `ids` and `exclude` are comma-separated card ids; unknown ids are ignored. `type` and `ids` together
  allow only cards matching both, and `exclude` is removed last.
- `pool` counts every card the filters allow, however few `limit` lets through; `total` is the deck size.
- A bad `limit` answers 400; a filter nothing matches answers 200 with `cards: []` and `pool: 0`.
- It holds no state and enforces nothing: clients send the cards they've seen as `exclude`. To show one
  card to a whole group, the host app picks its id and each phone fetches `/api/cards/:cardId`.

Options: `prefix` (default `/api/cards`) and `rng` (default `Math.random`, injectable for repeatable draws).

## The page

`/` draws cards (by card type, a short list of ids, and how many), excluding the cards already seen
(hover "N seen" for their ids), and shows the pool each draw came from. "One card for everyone" looks a
card up by id. Beside the Draw button, **Printed look** shows cards as the physical cards appear. Each
section's result has two tabs: **Cards** (or **Card**), rendered, and **API call**, its request and the
formatted response, errors included. Before the first draw, the API call is the deck load, `GET /api/cards`.

## Layout

| Path | What it is |
| --- | --- |
| `worker/cards/` | The card service: `routeCardsRequest`, and the pure `filterCards`, `drawCards`, `getCard` |
| `worker/data/the-and-deck.json` | The deck, generated from the CSV (committed) |
| `scripts/build-deck.ts` | Generates the deck: `pnpm build:deck`. Run it when the CSV changes |
| `src/cards/` | The page's components, the API client, and `icons/`: the chosen glyph per card type |
| `sources/` | Source material: the cards and icons CSVs, photos of the printed cards and icon crops, and `icons/`, an archive of every glyph drawn (including the unused whole-heart alternate) |

The glyphs were traced by hand from the icon crops. To change one, edit its SVG in `src/cards/icons/`
(and in the `sources/icons/` archive). A new card type needs a glyph named after it there; the deck test
checks that every card type has one.

## Scripts

As in [`000-template`](../000-template#scripts), plus `pnpm build:deck`.
