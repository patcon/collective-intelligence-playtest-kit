/** A wait in ms, uniformly between `minMs` and `maxMs`. `random` is injectable for tests. */
export function randomDelay(minMs: number, maxMs: number, random: () => number = Math.random): number {
  return minMs + random() * (maxMs - minMs);
}
