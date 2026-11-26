import { Banner, Button } from '@cloudflare/kumo';
import type { ReactNode } from 'react';

export interface StartScreenProps {
  title: string;
  /** What to do, shown unless there's an illustration. */
  instruction: string;
  /** Shown in place of the instruction: a picture, tinted to sit over the colour behind it. */
  illustration?: ReactNode;
  /** Why something won't work here (an insecure page, a missing sensor), or null. */
  warning: string | null;
  startLabel?: string;
  /** Called from the tap, so it can ask for anything browsers only grant from a gesture (motion, audio, wake lock). */
  onStart: () => void;
}

/** A phone's first screen: what this is, what to do, and the tap that grants permissions. */
export function StartScreen({ title, instruction, illustration, warning, startLabel = 'Tap to start', onStart }: StartScreenProps) {
  return (
    <main className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-kumo-base p-8 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {illustration ?? <p className="max-w-sm text-kumo-subtle">{instruction}</p>}
      <Button onClick={onStart} size="lg" variant="primary">
        {startLabel}
      </Button>
      {warning && <Banner className="max-w-sm" variant="alert" description={warning} />}
    </main>
  );
}
