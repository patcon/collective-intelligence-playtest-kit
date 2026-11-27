# Conversation cards are served by a small handwritten REST handler, not a generated GraphQL server

We considered generating a GraphQL API from the deck JSON with `json-graphql-server`, but chose a small handwritten REST handler instead. The service's main feature is the random draw, which a generated schema can't express: we'd end up writing that resolver ourselves anyway. The package is also designed for Express and an in-browser mock rather than Workers, and it pulls in `graphql`, Apollo and Express to serve a deck of under 200 cards. The mutations it would add can't work against a bundled, read-only deck. We kept one idea from it: a `meta` count of the pool, modelled on its `_allXMeta { count }`.

## Consequences

Revisit this if the service grows into a general content service: several decks, editable cards, or rich queries across many fields.
