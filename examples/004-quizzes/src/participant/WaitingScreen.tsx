import { Loader } from '@cloudflare/kumo';

/** Ready, and waiting: for the quiz to start, or (`late`) for the next one. */
export function WaitingScreen({ late }: { late: boolean }) {
  return (
    <main className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-kumo-base p-8 text-center">
      <Loader />
      <p className="max-w-sm text-lg">{late ? 'The quiz has already started. You’ll join the next one.' : 'Waiting for the quiz to start…'}</p>
    </main>
  );
}
