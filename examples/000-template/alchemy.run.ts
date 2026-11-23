import { Website, providers, state } from '@alchemy.run/cloudflare';
import { Stack } from 'alchemy';
import { gen } from 'effect/Effect';

export default Stack(
  '000-template',
  { providers: providers(), state: state() },
  gen(function* () {
    const website = yield* Website.Vite('Website', {
      assets: { notFoundHandling: 'single-page-application' },
    });

    return { url: website.url };
  }),
);
