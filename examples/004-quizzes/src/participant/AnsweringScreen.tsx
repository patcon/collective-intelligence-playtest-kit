import { Button } from '@cloudflare/kumo';
import { useState } from 'react';
import { ANSWER_SCALE, itemById } from '../items/items.ts';
import type { ItemId } from '../items/items.ts';
import type { Answer } from '../room/protocol.ts';
import { UndoButton } from './UndoButton.tsx';

/** How long a tapped answer shows as chosen before it's sent and the next statement comes in. */
const CHOSEN_MS = 250;

interface AnsweringScreenProps {
  item: ItemId;
  /** From 0. */
  position: number;
  total: number;
  /** What was picked here before an Undo brought them back, to show it on the options; undefined if nothing or a skip. */
  picked: Answer | undefined;
  onAnswer: (answer: Answer) => void;
  onUndo: () => void;
}

/**
 * One statement: "7 / 30", the statement, Disagree … Agree, Skip, and Undo (not on the first). A tap shows
 * the answer as chosen for a moment, then sends it. Keyed by statement where it's used, so each statement
 * mounts fresh: it slides in, nothing is left chosen, and focus moves to the statement (see `focusOnMount`).
 */
export function AnsweringScreen({ item, position, total, picked, onAnswer, onUndo }: AnsweringScreenProps) {
  const [chosen, setChosen] = useState<Answer | undefined>(undefined);
  const shown = chosen === undefined ? picked : chosen;

  const choose = (answer: Answer) => {
    if (chosen !== undefined) {
      return;
    }
    setChosen(answer);
    setTimeout(() => onAnswer(answer), CHOSEN_MS);
  };

  return (
    <main className="fixed inset-0 flex flex-col gap-6 overflow-hidden bg-kumo-base p-6">
      <p className="text-center text-sm tabular-nums text-kumo-subtle">{`${position + 1} / ${total}`}</p>
      <div className="statement-in flex flex-1 flex-col gap-6">
        <h1 className="flex min-h-32 items-center justify-center text-center text-2xl font-semibold outline-none" ref={focusOnMount} tabIndex={-1}>
          {itemById(item).text}
        </h1>
        <div className="flex flex-col gap-2">
          {ANSWER_SCALE.map(({ value, label }) => (
            <Button
              aria-pressed={shown === value}
              className={chosen === value ? 'answer-chosen w-full' : 'w-full'}
              key={value}
              onClick={() => choose(value)}
              size="lg"
              variant={shown === value ? 'primary' : 'secondary'}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between">
          {/* Its place is kept on the first statement, so Skip doesn't move. */}
          <div className={position === 0 ? 'invisible' : undefined}>
            <UndoButton onUndo={() => chosen === undefined && onUndo()} />
          </div>
          {/* Lit only as it's tapped: going back to a skipped statement shows no answer picked, not Skip. */}
          <Button className={chosen === null ? 'answer-chosen' : undefined} onClick={() => choose(null)} variant={chosen === null ? 'primary' : 'ghost'}>
            Skip
          </Button>
        </div>
      </div>
    </main>
  );
}

/** Moves focus to a new statement, so the last tap's focus ring doesn't carry over and screen readers read it out. */
function focusOnMount(element: HTMLElement | null): void {
  element?.focus({ preventScroll: true });
}
