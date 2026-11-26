import { VitePWA } from 'vite-plugin-pwa';
import type { Plugin, PluginOption } from 'vite';

/**
 * A service worker that keeps the built app (every HTML, JS, CSS and font file) cached, so a refresh
 * while offline still loads the page. Navigations fall back to the cached `index.html`, the same
 * single-page fallback the Worker gives online; `/api/*` is left alone, so it fails offline as it
 * should. A load still shows the cached build first; a new deploy's worker installs alongside it
 * and waits, and `registerSW` in src/main.tsx has it take over and reloads the page onto the new
 * build. Built only, so try it with `pnpm preview`.
 */
export function offline(): PluginOption {
  return [
    VitePWA({
      injectRegister: false,
      manifest: false,
      // Wait once installed, rather than taking over mid-load where the page can miss it.
      registerType: 'prompt',
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{html,js,css,svg,png,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
    removeWorkerInDev(),
  ];
}

const SELF_REMOVING_WORKER = `
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', async () => {
  await self.registration.unregister();
  for (const client of await self.clients.matchAll({ type: 'window' })) {
    client.navigate(client.url);
  }
});
`;

/**
 * `dev` and `preview` share a port (port.ts), so to the browser they're one origin, and a worker
 * `preview` left behind would go on serving its cached build over the dev server. The browser checks
 * `/sw.js` for updates on each load; in dev it gets one that unregisters itself and reloads the page.
 */
function removeWorkerInDev(): Plugin {
  return {
    name: 'playtest-kit:remove-service-worker-in-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/sw.js', (_request, response) => {
        response.setHeader('Content-Type', 'text/javascript');
        response.end(SELF_REMOVING_WORKER);
      });
    },
  };
}
