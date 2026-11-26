import type { GroupProgress } from '../room/roomViews.ts';

/**
 * "x of N found", as one member of the group sees it. They never have to find themselves, so they
 * count as found whether or not they've tapped "found them" yet (`tapped`).
 */
export function foundCount({ found, size }: GroupProgress, tapped: boolean): string {
  return `${tapped ? found : found + 1} of ${size} found`;
}
