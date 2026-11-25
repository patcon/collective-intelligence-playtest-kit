import { shuffle } from './rng.ts';
import type { Rng } from './rng.ts';

/** The `random` algorithm: any order is as good as another, so groups are whoever lands together. */
export function random(ids: ReadonlyArray<string>, rng: Rng): Array<string> {
  return shuffle(ids, rng);
}
