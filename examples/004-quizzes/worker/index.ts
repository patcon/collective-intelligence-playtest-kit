/**
 * Answers `/agents/*` (routed here first; see `runWorkerFirst` in alchemy.run.ts), where the quiz room's
 * sockets will connect, and leaves every other path to the static assets. There's no room yet.
 */
export default {
  fetch(): Response {
    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler;
