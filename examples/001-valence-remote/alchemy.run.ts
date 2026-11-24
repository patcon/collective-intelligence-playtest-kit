import { DurableObject, Website, providers, state } from '@alchemy.run/cloudflare';
import { Stack } from 'alchemy';
import { gen } from 'effect/Effect';

const lan = process.env.LAN === '1';

export default Stack(
  '001-valence-remote',
  { providers: providers(), state: state() },
  gen(function* () {
    const website = yield* Website.Vite('Website', {
      main: 'worker/index.ts',
      assets: { notFoundHandling: 'single-page-application', runWorkerFirst: ['/agents/*'] },
      dev: { host: lan ? '0.0.0.0' : 'localhost' },
      env: { ValenceRoom: DurableObject('ValenceRoom') },
    });

    return { url: website.url };
  }),
);
