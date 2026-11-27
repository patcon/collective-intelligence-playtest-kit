import { routeCardsRequest } from './cards/routeCardsRequest.ts';
import deck from './data/the-and-deck.json' with { type: 'json' };

/**
 * Answers `/api/*` (routed here first; see `runWorkerFirst` in alchemy.run.ts) and leaves every
 * other path to the static assets. The card routes are documented on `routeCardsRequest`.
 */
export default {
  async fetch(request): Promise<Response> {
    return (await routeCardsRequest(request, deck)) ?? new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler;
