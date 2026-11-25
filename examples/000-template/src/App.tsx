import { Loader, Surface } from '@cloudflare/kumo';
import { Suspense } from 'react';
import { loadCount } from './counter/countApi.ts';
import { SharedCounter } from './counter/SharedCounter.tsx';

/** Started as the module loads, so the request is in flight before React's first render. */
const initialCount = loadCount();

export default function App() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center p-4">
      <Surface className="flex w-full flex-col gap-4 rounded-lg p-6">
        <h1 className="text-xl font-semibold">000-template</h1>
        <Suspense fallback={<Loader />}>
          <SharedCounter initial={initialCount} />
        </Suspense>
      </Surface>
    </main>
  );
}
