import { UndoButton } from './UndoButton.tsx';

/** Every statement answered or skipped. Undo goes back to the last one. */
export function DoneScreen({ onUndo }: { onUndo: () => void }) {
  return (
    <main className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-kumo-base p-8 text-center">
      <p className="text-2xl font-semibold">You’re done. Thanks!</p>
      <UndoButton onUndo={onUndo} />
    </main>
  );
}
