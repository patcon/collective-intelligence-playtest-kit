import { Banner, Checkbox, Loader, Surface } from '@cloudflare/kumo';
import { Component, Suspense, useState } from 'react';
import type { ReactNode } from 'react';
import { CardDrawer } from './cards/CardDrawer.tsx';
import { CardLookup } from './cards/CardLookup.tsx';
import { messageOf, requestCards } from './cards/cardsApi.ts';

/** Started as the module loads, so the request is in flight before React's first render. */
const deck = requestCards();

export default function App() {
  const [printed, setPrinted] = useState(false);
  const printedToggle = (
    <Checkbox checked={printed} label="Printed look" onCheckedChange={(checked) => setPrinted(checked === true)} />
  );
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">003 · Conversation card service</h1>
        <p className="text-sm text-kumo-subtle">
          Draws conversation prompts from a deck through a small card service that keeps no state of its own. The page sends the cards
          it’s already seen, so nothing repeats, and to show one card to a whole group, each phone fetches it by id.
        </p>
      </header>
      <Surface className="flex flex-col gap-4 rounded-lg p-6">
        <h2 className="text-lg font-semibold">Draw</h2>
        <LoadFailure>
          <Suspense fallback={<Loader />}>
            <CardDrawer beside={printedToggle} deck={deck} printed={printed} />
          </Suspense>
        </LoadFailure>
      </Surface>
      <Surface className="flex flex-col gap-4 rounded-lg p-6">
        <h2 className="text-lg font-semibold">One card for everyone</h2>
        <CardLookup printed={printed} />
      </Surface>
    </main>
  );
}

interface LoadFailureState {
  readonly error: unknown;
}

/** Shows why the deck couldn't load, in place of the draw controls. */
class LoadFailure extends Component<{ children: ReactNode }, LoadFailureState> {
  override state: LoadFailureState = { error: null };

  static getDerivedStateFromError(error: unknown): LoadFailureState {
    return { error };
  }

  render() {
    return this.state.error ? <Banner description={messageOf(this.state.error)} variant="alert" /> : this.props.children;
  }
}
