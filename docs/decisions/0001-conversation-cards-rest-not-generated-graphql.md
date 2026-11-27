# Conversation cards are served by a small handwritten REST handler, not a generated GraphQL server

**Context.** Apps need an endpoint that hands out conversation cards from a deck. Its main job is a random draw from a filtered pool. The deck is a bundled, read-only JSON file of under 200 cards, served from a Cloudflare Worker.

**Decision.** A small handwritten REST handler (`routeCardsRequest`) with three GET routes: list, random draw, and one card by id.

**Alternatives.** Generating a GraphQL API from the deck JSON with `json-graphql-server`. Rejected:

- A generated schema can filter and page through cards but can't express a random draw, so we'd write that resolver ourselves anyway.
- The package is built around Express and an in-browser mock, not Workers.
- It pulls in `graphql`, Apollo and Express for a tiny deck.
- The mutations it adds can't work against a read-only bundle.

We kept one idea from it: a `meta` count of the pool, modelled on its `_allXMeta { count }`.

**Consequences.** Any app can mount the service with one line and call it with plain `fetch`. Richer queries need new routes. Revisit this if the service grows into a general content service: several decks, editable cards, or queries across many fields.
