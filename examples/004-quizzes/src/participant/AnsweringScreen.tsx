import { Button } from '@cloudflare/kumo';
import { ANSWER_SCALE, itemById } from '../items/items.ts';
import type { ItemId } from '../items/items.ts';
import type { Answer } from '../room/protocol.ts';
import { UndoButton } from './UndoButton.tsx';

interface AnsweringScreenProps {
  item: ItemId;
  /** From 0. */
  position: number;
  total: number;
  /** What was picked here before an Undo brought them back, to show it; undefined if nothing. */
  picked: Answer | undefined;
  onAnswer: (answer: Answer) => void;
  onUndo: () => void;
}

/** One statement: "7 / 30", the statement, Disagree … Agree, Skip, and Undo (not on the first). */
export function AnsweringScreen({ item, position, total, picked, onAnswer, onUndo }: AnsweringScreenProps) {
  return (
    <main className="fixed inset-0 flex flex-col gap-6 bg-kumo-base p-6">
      <p className="text-center text-sm tabular-nums text-kumo-subtle">{`${position + 1} / ${total}`}</p>
      <p className="flex min-h-32 items-center justify-center text-center text-2xl font-semibold">{itemById(item).text}</p>
      <div className="flex flex-col gap-2">
        {ANSWER_SCALE.map(({ value, label }) => (
          <Button className="w-full" key={value} onClick={() => onAnswer(value)} size="lg" variant={picked === value ? 'primary' : 'secondary'}>
            {label}
          </Button>
        ))}
      </div>
      <div className="mt-auto flex items-center justify-between">
        {/* Its place is kept on the first statement, so Skip doesn't move. */}
        <div className={position === 0 ? 'invisible' : undefined}>
          <UndoButton onUndo={onUndo} />
        </div>
        <Button onClick={() => onAnswer(null)} variant={picked === null ? 'primary' : 'ghost'}>
          Skip
        </Button>
      </div>
    </main>
  );
}
