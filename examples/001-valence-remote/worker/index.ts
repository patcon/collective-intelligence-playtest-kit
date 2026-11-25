import { routeAgentRequest } from 'agents';

export { ValenceRoom } from './ValenceRoom.ts';

export default {
  async fetch(request: Request, env: Parameters<typeof routeAgentRequest>[1]): Promise<Response> {
    return (await routeAgentRequest(request, env)) ?? new Response('Not found', { status: 404 });
  },
};
