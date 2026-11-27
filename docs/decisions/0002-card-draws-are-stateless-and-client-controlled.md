# Card draws are stateless and the client controls them

The card service remembers nothing between requests and doesn't enforce which cards a client may draw. Clients narrow the pool themselves (card type, chosen IDs) and send their seen cards as `exclude` to avoid repeats. We chose this so that any app can mount the service with one line and no storage. Apps that need a shared or enforced draw (for example, one card chosen for a whole group) make that choice in their own server logic, such as a room's Durable Object, and hand clients the card's ID to fetch.

## Consequences

Nothing stops a client from requesting any card, or from drawing a card it has already seen. That's acceptable for facilitated playtests, but the API isn't a fair or secret draw.
