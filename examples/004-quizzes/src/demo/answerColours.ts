import type { Answer } from '../room/protocol.ts';

/** A cell's class for an answer (one of five steps on a diverging scale), a skip, or no answer yet. Styled in `styles.css`. */
export function cellClassOf(answer: Answer | undefined): string {
  if (answer === undefined) {
    return 'vote-cell vote-blank';
  }
  return answer === null ? 'vote-cell vote-skip' : `vote-cell vote-${answer}`;
}
