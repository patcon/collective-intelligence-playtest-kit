import type { Counter } from './Counter.ts';

export { Counter } from './Counter.ts';

interface Env {
  Counter: DurableObjectNamespace<Counter>;
}

/**
 * Answers `/api/*` (routed here first; see `runWorkerFirst` in alchemy.run.ts) and leaves every
 * other path to the static assets. `GET /api/count` reads the shared count, `POST` adds one.
 */
export default {
  async fetch(request, env): Promise<Response> {
    if (new URL(request.url).pathname !== '/api/count') {
      return new Response('Not found', { status: 404 });
    }
    const counter = env.Counter.getByName('shared');
    switch (request.method) {
      case 'GET':
        return Response.json({ count: await counter.read() });
      case 'POST':
        return Response.json({ count: await counter.increment() });
      default:
        return new Response('Method not allowed', { headers: { Allow: 'GET, POST' }, status: 405 });
    }
  },
} satisfies ExportedHandler<Env>;
