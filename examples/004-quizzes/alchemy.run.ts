import { Website, providers, state } from '@alchemy.run/cloudflare';
import { Stack } from 'alchemy';
import { map } from 'alchemy/Output';
import { gen } from 'effect/Effect';
import { PORT } from './port.ts';

const lan = process.env.LAN === '1';

/** vite.config.ts mirrors this Worker's config for `pnpm preview`; change both together. */
export default Stack(
  '004-quizzes',
  { providers: providers(), state: state() },
  gen(function* () {
    const website = yield* Website.Vite('Website', {
      main: 'worker/index.ts',
      assets: { notFoundHandling: 'single-page-application', runWorkerFirst: ['/agents/*'] },
      dev: { host: lan ? '0.0.0.0' : 'localhost', port: PORT },
    });

    // In dev, `urls` lists localhost and each LAN address, the way `vite --host` does. Alchemy
    // (2.0.0-beta.87) writes them as http:// even when the dev server serves HTTPS, as it does with LAN=1.
    const urls = map(website.urls, (all) => (lan ? all.map((url) => url.replace(/^http:/, 'https:')) : all));

    return { url: website.url, urls };
  }),
);
