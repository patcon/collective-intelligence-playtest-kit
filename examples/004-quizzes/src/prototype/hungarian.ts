/**
 * PROTOTYPE. The Hungarian algorithm: the assignment of rows to columns with the least total cost, in O(n³).
 * A rectangular matrix is padded to square with zeros, so with more rows than columns some rows get no
 * column (-1), and vice versa.
 */

interface State {
  /** Square cost matrix, 1-indexed (row and column 0 unused). */
  cost: Array<Array<number>>;
  size: number;
  u: Array<number>;
  v: Array<number>;
  /** The row assigned to each column; 0 is none. */
  p: Array<number>;
  way: Array<number>;
}

const at = (values: ReadonlyArray<number>, i: number) => values[i] ?? 0;

/** Updates the slack of each unvisited column from row `p[j0]`; returns the column with the least slack, and it. */
function leastSlack(s: State, j0: number, used: ReadonlyArray<boolean>, minv: Array<number>) {
  const i0 = at(s.p, j0);
  let delta = Number.POSITIVE_INFINITY;
  let j1 = 0;
  for (let j = 1; j <= s.size; j += 1) {
    if (used[j]) {
      continue;
    }
    const cur = at(s.cost[i0] ?? [], j) - at(s.u, i0) - at(s.v, j);
    if (cur < at(minv, j)) {
      minv[j] = cur;
      s.way[j] = j0;
    }
    if (at(minv, j) < delta) {
      delta = at(minv, j);
      j1 = j;
    }
  }
  return { delta, j1 };
}

/** One step of the search for an augmenting path: tightens the potentials by the least slack and returns the next column to visit. */
function step(s: State, j0: number, used: Array<boolean>, minv: Array<number>): number {
  used[j0] = true;
  const { delta, j1 } = leastSlack(s, j0, used, minv);
  for (let j = 0; j <= s.size; j += 1) {
    if (used[j]) {
      const row = at(s.p, j);
      s.u[row] = at(s.u, row) + delta;
      s.v[j] = at(s.v, j) - delta;
    } else {
      minv[j] = at(minv, j) - delta;
    }
  }
  return j1;
}

/** Adds row `i` to the assignment, re-routing earlier rows along the augmenting path found. */
function addRow(s: State, i: number): void {
  s.p[0] = i;
  let j0 = 0;
  const used = Array.from({ length: s.size + 1 }, () => false);
  const minv = Array.from({ length: s.size + 1 }, () => Number.POSITIVE_INFINITY);
  do {
    j0 = step(s, j0, used, minv);
  } while ((s.p[j0] ?? 0) !== 0);
  do {
    const j1 = s.way[j0] ?? 0;
    s.p[j0] = s.p[j1] ?? 0;
    j0 = j1;
  } while (j0 !== 0);
}

/** For each row of `cost`, the column it's assigned to (minimising the total), or -1 if none. */
export function hungarian(cost: ReadonlyArray<ReadonlyArray<number>>): Array<number> {
  const rows = cost.length;
  const cols = Math.max(0, ...cost.map((r) => r.length));
  const size = Math.max(rows, cols);
  const square = Array.from({ length: size + 1 }, (_, i) => Array.from({ length: size + 1 }, (_, j) => (i === 0 || j === 0 ? 0 : (cost[i - 1]?.[j - 1] ?? 0))));
  const zeros = () => Array.from({ length: size + 1 }, () => 0);
  const s: State = { cost: square, p: zeros(), size, u: zeros(), v: zeros(), way: zeros() };
  for (let i = 1; i <= size; i += 1) {
    addRow(s, i);
  }
  const assignment = Array.from({ length: rows }, () => -1);
  for (let j = 1; j <= size; j += 1) {
    const i = s.p[j] ?? 0;
    if (i >= 1 && i <= rows && j <= cols) {
      assignment[i - 1] = j - 1;
    }
  }
  return assignment;
}
