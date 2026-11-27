import { Surface } from '@cloudflare/kumo';

/** A phone's page: start, answer each statement, done. Not built yet. */
export function Participate() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center p-4">
      <Surface className="w-full rounded-lg p-6">
        <h1 className="text-xl font-semibold">Personality quiz</h1>
      </Surface>
    </main>
  );
}
