/**
 * PROTOTYPE. Clustering that starts from the clusters already shown, rather than from scratch: Leiden's
 * local-moving phase under the same objective (the Constant Potts Model, unit node sizes), seeded with the
 * previous labels. Each person in turn moves to whichever neighbouring cluster (or a cluster of their own)
 * improves the objective most, until no one moves; then clusters that have come apart are split into their
 * connected pieces, as Leiden guarantees connected clusters. Because it only makes moves that help, people stay
 * where they were unless their new answers give them a reason to go, so clusters drift instead of reshuffling.
 * Without Leiden's coarsening it can't merge or split whole clusters in one move, so reclustering from scratch
 * now and then (switching back to Leiden) is how to pick up larger changes in structure.
 */

/** Weighted, undirected: each person's neighbours and the weight of the link to each. */
export type Adjacency = ReadonlyMap<string, ReadonlyMap<string, number>>;

interface Partition {
  community: Map<string, number>;
  size: Map<number, number>;
  next: number;
}

function startPartition(ids: ReadonlyArray<string>, start: ReadonlyMap<string, number>): Partition {
  let next = Math.max(-1, ...ids.map((id) => start.get(id) ?? -1)) + 1;
  const community = new Map<string, number>();
  const size = new Map<number, number>();
  for (const id of ids) {
    const previous = start.get(id) ?? -1;
    const label = previous >= 0 ? previous : next++;
    community.set(id, label);
    size.set(label, (size.get(label) ?? 0) + 1);
  }
  return { community, next, size };
}

/** Total link weight from `id` to each community among its neighbours. */
function weightsTo(id: string, adjacency: Adjacency, community: ReadonlyMap<string, number>): Map<number, number> {
  const weights = new Map<number, number>();
  for (const [other, w] of adjacency.get(id) ?? []) {
    const c = community.get(other) ?? -1;
    weights.set(c, (weights.get(c) ?? 0) + w);
  }
  return weights;
}

/** The community `id` gains most by joining (CPM), or its own if no move helps; `p.next` stands for a new one. */
function bestMove(id: string, adjacency: Adjacency, p: Partition, gamma: number): number {
  const own = p.community.get(id) ?? -1;
  const weights = weightsTo(id, adjacency, p.community);
  // What staying is worth: links into its own community, less the penalty for that community's size.
  const stay = (weights.get(own) ?? 0) - gamma * ((p.size.get(own) ?? 1) - 1);
  let best = own;
  let bestGain = -stay > 1e-12 ? -stay : 0;
  if (bestGain > 0) {
    best = p.next;
  }
  for (const [c, w] of weights) {
    const gain = w - gamma * (p.size.get(c) ?? 0) - stay;
    if (c !== own && gain > bestGain + 1e-12) {
      best = c;
      bestGain = gain;
    }
  }
  return best;
}

function move(p: Partition, id: string, to: number): void {
  const from = p.community.get(id) ?? -1;
  p.size.set(from, (p.size.get(from) ?? 1) - 1);
  p.size.set(to, (p.size.get(to) ?? 0) + 1);
  p.community.set(id, to);
  if (to === p.next) {
    p.next += 1;
  }
}

/** Relabels as `piece` everyone reachable from `start` through members of community `label`, marking them seen. */
function claimPiece(adjacency: Adjacency, p: Partition, start: string, label: number, piece: number, seen: Set<string>): void {
  const queue = [start];
  seen.add(start);
  while (queue.length > 0) {
    const id = queue.pop() ?? '';
    p.community.set(id, piece);
    const unseen = [...(adjacency.get(id)?.keys() ?? [])].filter((other) => !seen.has(other) && p.community.get(other) === label);
    for (const other of unseen) {
      seen.add(other);
      queue.push(other);
    }
  }
}

/** Each community's connected pieces get labels of their own; the first piece keeps the community's label. */
function splitDisconnected(adjacency: Adjacency, p: Partition): void {
  const seen = new Set<string>();
  const firstPiece = new Set<number>();
  for (const start of [...p.community.keys()].toSorted()) {
    if (!seen.has(start)) {
      const label = p.community.get(start) ?? -1;
      claimPiece(adjacency, p, start, label, firstPiece.has(label) ? p.next++ : label, seen);
      firstPiece.add(label);
    }
  }
}

/** Community per person, starting from `start` (missing or -1: a community of their own). */
export function warmStart(adjacency: Adjacency, start: ReadonlyMap<string, number>, gamma: number, maxPasses = 20): Map<string, number> {
  const ids = [...adjacency.keys()].toSorted();
  const p = startPartition(ids, start);
  for (let pass = 0; pass < maxPasses; pass += 1) {
    let moved = 0;
    for (const id of ids) {
      const to = bestMove(id, adjacency, p, gamma);
      if (to !== p.community.get(id)) {
        move(p, id, to);
        moved += 1;
      }
    }
    if (moved === 0) {
      break;
    }
  }
  splitDisconnected(adjacency, p);
  return p.community;
}
