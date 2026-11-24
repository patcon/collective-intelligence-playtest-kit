/** Stable pseudo-random in [0, 1) so fill particles don't shimmer when the path is rebuilt. */
export function hash01(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43_758.5453;
  return x - Math.floor(x);
}

/** `arr[i]` for an index the caller keeps in range (`noUncheckedIndexedAccess` types every read as maybe undefined). */
export function at(arr: ArrayLike<number>, i: number): number {
  return arr[i] ?? 0;
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
