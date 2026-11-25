import { routeAgentRequest } from 'agents';

export { MatchRoom } from './MatchRoom.ts';

/**
 * Answers `/agents/*` (routed here first; see `runWorkerFirst` in alchemy.run.ts), where the room's
 * sockets connect, and leaves every other path to the static assets.
 */
export default {
  async fetch(request: Request, env: Parameters<typeof routeAgentRequest>[1]): Promise<Response> {
    return (await routeAgentRequest(request, env)) ?? new Response('Not found', { status: 404 });
  },
};
