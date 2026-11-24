import { Banner, Button } from '@cloudflare/kumo';

interface StartScreenProps {
  instruction: string;
  warning: string | null;
  onStart: () => void;
}

/** The first screen: what to do, and the tap iOS needs before it will share orientation. */
export function StartScreen({ instruction, warning, onStart }: StartScreenProps) {
  return (
    <main className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-kumo-base p-8 text-center">
      <h1 className="text-2xl font-semibold">Valence remote</h1>
      <p className="max-w-sm text-kumo-subtle">{instruction}</p>
      <Button onClick={onStart} size="lg" variant="primary">
        Tap to start
      </Button>
      {warning && <Banner className="max-w-sm" variant="alert" description={warning} />}
    </main>
  );
}
