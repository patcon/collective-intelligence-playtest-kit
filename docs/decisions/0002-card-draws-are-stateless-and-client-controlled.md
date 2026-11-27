# Card draws are stateless and the client controls them

**Context.** Small groups shouldn't see the same card twice, and sometimes a whole group should see one card. The card service should still mount in any app with one line, with no storage of its own.

**Decision.** The service remembers nothing between requests and doesn't enforce which cards a client may draw. Clients narrow the pool themselves (card type, chosen ids) and send their seen cards as `exclude` to avoid repeats. When a group needs one shared card, the host app's own server logic (for example a room's Durable Object) picks an id and clients fetch `/:cardId`.

**Alternatives.** The service could track seen cards per session or room, or hold a shared draw for a group. Both need storage and an identity for the session or group, which would tie the service to one app's model.

**Consequences.** Nothing stops a client from requesting any card, or drawing one it has already seen. That's acceptable for facilitated playtests, but the API isn't a fair or secret draw. Shared draws are built into each app that needs them.
