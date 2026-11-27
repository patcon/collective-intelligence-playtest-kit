import { Surface } from '@cloudflare/kumo';

/** The host's page: the quiz's controls, the simulated crowd and the vote matrix. Not built yet. */
export function Demo() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-4">
      <Surface className="flex flex-col gap-2 rounded-lg p-6">
        <h1 className="text-xl font-semibold">Quizzes</h1>
        <p className="text-kumo-subtle">A room takes a personality quiz together.</p>
      </Surface>
    </main>
  );
}
