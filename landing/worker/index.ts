import { parseApps, renderPage } from './page.ts';

interface Env {
  /** JSON list of `{ title, blurb, url }`, written by alchemy.run.ts from each app's deployed URL. */
  readonly APPS: string;
}

/** Serves the landing page at `/`, and nothing else. */
export default {
  fetch(request: Request, env: Env): Response {
    if (new URL(request.url).pathname !== '/') {
      return new Response('Not found', { status: 404 });
    }
    return new Response(renderPage(parseApps(env.APPS)), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
};
