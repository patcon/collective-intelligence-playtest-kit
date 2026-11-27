import { Button } from '@cloudflare/kumo';
import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react';

/** Back one statement, clearing that answer. */
export function UndoButton({ onUndo }: { onUndo: () => void }) {
  return (
    <Button icon={ArrowCounterClockwiseIcon} onClick={onUndo} variant="ghost">
      Undo
    </Button>
  );
}
