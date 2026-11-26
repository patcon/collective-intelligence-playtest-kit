import { Worker, providers, state } from '@alchemy.run/cloudflare';
import { Stack, stackRef } from 'alchemy';
import { all, map } from 'alchemy/Output';
import { gen } from 'effect/Effect';
import { APPS } from './apps.ts';

/** What each app's stack returns; only `url` is used here. */
interface AppStackOutput {
  readonly url?: string;
}

export default Stack(
  'playtest-kit-landing',
  { providers: providers(), state: state() },
  gen(function* () {
    const listed = [];
    for (const app of APPS) {
      // Reads the app's last deploy at this same stage, so deploy the apps first.
      const output = yield* stackRef<AppStackOutput>(app.stack);
      listed.push(map(output, ({ url }) => ({ title: app.title, blurb: app.blurb, url: url ?? '' })));
    }

    const landing = yield* Worker('Landing', {
      main: 'worker/index.ts',
      env: { APPS: map(all(...listed), (apps) => JSON.stringify(apps)) },
    });

    return { url: landing.url };
  }),
);
