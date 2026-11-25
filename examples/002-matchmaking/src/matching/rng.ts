/** A source of random numbers in [0, 1), such as `Math.random`. Injected, so tests can fix the outcome. */
export type Rng = () => number;

/** A repeatable `Rng` (mulberry32): the same `seed` always gives the same sequence. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d_2b_79_f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** A shuffled copy of `items`: each pick is equally likely to be any item not yet picked. */
export function shuffle<T>(items: ReadonlyArray<T>, rng: Rng): Array<T> {
  const pool = [...items];
  const out: Array<T> = [];
  while (pool.length > 0) {
    out.push(...pool.splice(Math.floor(rng() * pool.length), 1));
  }
  return out;
}
