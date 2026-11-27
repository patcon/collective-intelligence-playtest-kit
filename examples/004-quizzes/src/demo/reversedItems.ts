import { itemById } from '../items/items.ts';
import type { ItemId } from '../items/items.ts';
import type { Answer } from '../room/protocol.ts';

/** How the vote matrix shows answers to reversed statements: as given, or flipped to score towards the trait. */
export type ReversedView = 'answered' | 'flipped';

export const REVERSED_VIEWS: ReadonlyArray<{ label: string; value: ReversedView }> = [
  { label: 'As answered', value: 'answered' },
  { label: 'Flipped', value: 'flipped' },
];

const FLIPPED = { 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 } as const;

/**
 * `answer` to `item` as `view` shows it: flipped, a reversed statement's 1…5 reads 5…1, so every column's
 * Agree scores towards its trait. Skips and no answer yet stay as they are.
 */
export function shownAnswer(item: ItemId, answer: Answer | undefined, view: ReversedView): Answer | undefined {
  if (view === 'answered' || answer === undefined || answer === null || itemById(item).keyed === 1) {
    return answer;
  }
  return FLIPPED[answer];
}
