# The card service is a route function that works with any deck, kept in an example until it moves to `common`

**Context.** The card service is meant to be shared by future apps, but only `003-conversation-cards` uses it today. Shared code moves into `packages/common` once a second app needs it.

**Decision.** It starts in `examples/003-conversation-cards/worker/cards/`, shaped so it can move out later:

- It's a self-contained folder that imports nothing from outside it.
- Its entry point is `routeCardsRequest(request, deck, options) → Response | null`. That matches `routeAgentRequest`, so a host app mounts it with one `??` line.
- The deck is always passed in, so the shared code never depends on The And's data, which stays in the example.

**Alternatives.** Putting it in `packages/common` straight away, before there's a second user. Or writing it as Worker code that bundles The And deck directly, which would be simpler now but would need untangling before anything could share it.

**Consequences.** Moving it to `common` should be mostly a `git mv`. Until then, an app other than 003 can't import it.
