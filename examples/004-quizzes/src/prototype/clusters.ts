import createGraph from 'ngraph.graph';
import { detectClusters } from 'ngraph.leiden';
import { hungarian } from './hungarian.ts';
import { distance } from './table.ts';
import { warmStart } from './warmStart.ts';
import type { Table } from './table.ts';

/**
 * PROTOTYPE. Leiden clustering of the participants, as single-cell biologists do it: link each person to their
 * `k` nearest neighbours by answers (over the statements both answered), weight each link by how close they are,
 * and find communities with the Constant Potts Model, where a higher `resolution` gives more, smaller clusters.
 * The resolution is relative to the graph's density, so the same value gives similar-sized clusters at any count.
 */

export interface ClusterSettings {
  /** Neighbours each person is linked to. */
  k: number;
  resolution: number;
  /**
   * Only statements answered by at least this share of the people (0–1) count, so clusters aren't built on a
   * few early answers and then reshuffled as the rest come in; nothing is clustered until `MIN_STATEMENTS` qualify.
   */
  minCoverage: number;
  /** Move someone to another cluster only once two runs in a row put them there (see `damped`). */
  damp: boolean;
  /** `leiden` clusters from scratch each run; `warm` starts from the clusters shown (see warmStart.ts). */
  algorithm: ClusterAlgorithm;
}

export const CLUSTER_ALGORITHMS = [
  { label: 'Leiden, from scratch', value: 'leiden' },
  { label: 'From current clusters', value: 'warm' },
] as const;
export type ClusterAlgorithm = (typeof CLUSTER_ALGORITHMS)[number]['value'];

export const DEFAULT_CLUSTER_SETTINGS: ClusterSettings = { algorithm: 'warm', damp: true, k: 10, minCoverage: 0.5, resolution: 1 };

/** Clustering waits for at least this many statements answered by `minCoverage` of the people. */
export const MIN_STATEMENTS = 3;

/** The columns (indices) answered by at least `minCoverage` of the table's rows. */
export function coveredColumns(table: Table, minCoverage: number): Array<number> {
  const rows = Math.max(1, table.values.length);
  return table.colIds
    .map((_, c) => c)
    .filter((c) => table.values.filter((row) => row[c] !== null && row[c] !== undefined).length / rows >= minCoverage);
}

/** Clusters smaller than this are left as no cluster (-1). */
const MIN_SIZE = 3;
/** People with fewer answers than this aren't clustered yet. */
const MIN_ANSWERS = 4;

/** The k-nearest-neighbour graph of the people with enough answers, and the CPM resolution scaled to its density. */
interface SimilarityGraph {
  adjacency: Map<string, Map<string, number>>;
  gamma: number;
}

function link(adjacency: Map<string, Map<string, number>>, a: string, b: string, weight: number): void {
  const w = Math.max(weight, adjacency.get(a)?.get(b) ?? 0);
  adjacency.get(a)?.set(b, w);
  adjacency.get(b)?.set(a, w);
}

function similarityGraph(table: Table, { k, resolution, minCoverage }: ClusterSettings): SimilarityGraph | null {
  const columns = coveredColumns(table, minCoverage);
  const minAnswers = Math.min(MIN_ANSWERS, columns.length);
  const rows = table.values
    .map((values, i) => ({ id: table.rowIds[i] ?? '', values: columns.map((c) => values[c] ?? null) }))
    .filter((r) => r.values.filter((v) => v !== null).length >= minAnswers);
  if (columns.length < MIN_STATEMENTS || rows.length < MIN_SIZE * 2) {
    return null;
  }
  const neighbours = rows.map((a, i) =>
    rows
      .map((b, j) => ({ d: i === j ? Number.POSITIVE_INFINITY : distance(a.values, b.values), j }))
      .filter((n) => Number.isFinite(n.d))
      .toSorted((x, y) => x.d - y.d)
      .slice(0, k),
  );
  const scale = median(neighbours.flatMap((ns) => ns.map((n) => n.d))) || 1;
  const adjacency = new Map(rows.map((r) => [r.id, new Map<string, number>()]));
  neighbours.forEach((ns, i) => {
    for (const { d, j } of ns) {
      link(adjacency, rows[i]?.id ?? '', rows[j]?.id ?? '', Math.exp(-((d / scale) ** 2)));
    }
  });
  let totalWeight = 0;
  for (const links of adjacency.values()) {
    for (const w of links.values()) {
      totalWeight += w / 2;
    }
  }
  const density = totalWeight / ((rows.length * (rows.length - 1)) / 2);
  return { adjacency, gamma: resolution * density };
}

/** Leiden from scratch, via ngraph.leiden. */
function leiden({ adjacency, gamma }: SimilarityGraph): Map<string, number> {
  const graph = createGraph<undefined, { weight: number }>();
  for (const [a, links] of adjacency) {
    graph.addNode(a);
    for (const [b, weight] of links) {
      if (a < b) {
        graph.addLink(a, b, { weight });
      }
    }
  }
  const result = detectClusters(graph, { quality: 'cpm', randomSeed: 7, resolution: gamma });
  return new Map([...adjacency.keys()].map((id) => [id, result.getClass(id)]));
}

/**
 * Cluster label per participant id, numbered from 0 by size; -1 is no cluster. `from scratch` runs Leiden anew;
 * `warm` starts from `current` (see warmStart.ts), or from scratch when there are no clusters yet.
 */
export function clusterPeople(table: Table, settings: ClusterSettings, current: ReadonlyMap<string, number>): Map<string, number> {
  const labels = new Map<string, number>(table.rowIds.map((id) => [id, -1]));
  const graph = similarityGraph(table, settings);
  if (!graph) {
    return labels;
  }
  const warm = settings.algorithm === 'warm' && [...current.values()].some((l) => l >= 0);
  const membership = warm ? warmStart(graph.adjacency, current, graph.gamma) : leiden(graph);
  const communities = new Map<number, Array<string>>();
  for (const [id, c] of membership) {
    communities.set(c, [...(communities.get(c) ?? []), id]);
  }
  [...communities.values()]
    .filter((members) => members.length >= MIN_SIZE)
    .toSorted((a, b) => b.length - a.length)
    .forEach((members, label) => {
      for (const id of members) {
        labels.set(id, label);
      }
    });
  return labels;
}

/**
 * `proposed`, except that anyone it would move out of their `shown` cluster stays put unless the run before
 * (`previous`) proposed the same move. Leiden reruns from scratch, and on data without sharp groups a few new
 * answers shift the boundaries, so a third of people can flip on any run; most flips don't last. Waiting for a
 * second run to agree cuts that churn about fourfold, at the cost of a move showing one run later.
 */
export function damped(shown: ReadonlyMap<string, number>, proposed: ReadonlyMap<string, number>, previous: ReadonlyMap<string, number>): Map<string, number> {
  return new Map(
    [...proposed].map(([id, label]) => {
      const old = shown.get(id) ?? -1;
      const hold = old >= 0 && label !== old && previous.get(id) !== label;
      return [id, hold ? old : label];
    }),
  );
}

/** How many people were in a cluster both times, and how many of them are in a different one now. */
export function countChanges(prev: ReadonlyMap<string, number>, next: ReadonlyMap<string, number>) {
  let both = 0;
  let changed = 0;
  for (const [id, label] of next) {
    const old = prev.get(id) ?? -1;
    if (label >= 0 && old >= 0) {
      both += 1;
      changed += label === old ? 0 : 1;
    }
  }
  return { both, changed };
}

/** How many people have each label (from 0; -1, no cluster, isn't counted). */
function sizes(labels: ReadonlyMap<string, number>): Map<number, number> {
  const counts = new Map<number, number>();
  for (const label of labels.values()) {
    if (label >= 0) {
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  return counts;
}

/** How many people each (new label, old label) pair shares, keyed `new:old`. */
function overlaps(prev: ReadonlyMap<string, number>, next: ReadonlyMap<string, number>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const [id, label] of next) {
    const old = prev.get(id) ?? -1;
    if (label >= 0 && old >= 0) {
      counts.set(`${label}:${old}`, (counts.get(`${label}:${old}`) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * `next` relabelled to keep `prev`'s labels where the clusters match best, so colours stay put as clustering
 * reruns on live data. Clusters are compared by Jaccard overlap (people in both ÷ people in either), so a small
 * cluster isn't outbid by a big one that merely shares more people, and the Hungarian algorithm picks the
 * pairing with the most overlap in total. When a cluster splits, the piece that overlaps most keeps the label;
 * when two merge, the result takes the label it overlaps most. Clusters matching nothing get the lowest free labels.
 */
export function matchLabels(prev: ReadonlyMap<string, number>, next: ReadonlyMap<string, number>): Map<string, number> {
  const newSizes = sizes(next);
  const oldSizes = sizes(prev);
  const shared = overlaps(prev, next);
  const newLabels = [...newSizes.keys()].toSorted((a, b) => a - b);
  const oldLabels = [...oldSizes.keys()].toSorted((a, b) => a - b);
  const jaccard = newLabels.map((label) =>
    oldLabels.map((old) => {
      const both = shared.get(`${label}:${old}`) ?? 0;
      return both / ((newSizes.get(label) ?? 0) + (oldSizes.get(old) ?? 0) - both);
    }),
  );
  const assignment = hungarian(jaccard.map((row) => row.map((j) => -j)));

  const mapping = new Map<number, number>();
  newLabels.forEach((label, i) => {
    const old = oldLabels[assignment[i] ?? -1];
    if (old !== undefined && (jaccard[i]?.[assignment[i] ?? -1] ?? 0) > 0) {
      mapping.set(label, old);
    }
  });
  const used = new Set(mapping.values());
  let fresh = 0;
  for (const label of newLabels.filter((l) => !mapping.has(l))) {
    while (used.has(fresh)) {
      fresh += 1;
    }
    mapping.set(label, fresh);
    used.add(fresh);
  }
  return new Map([...next].map(([id, label]) => [id, label < 0 ? -1 : (mapping.get(label) ?? -1)]));
}

function median(values: ReadonlyArray<number>): number {
  const sorted = values.toSorted((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

/** Distinct colours for cluster labels, then repeats. */
const PALETTE = ['#2563eb', '#ea580c', '#9333ea', '#0891b2', '#ca8a04', '#db2777', '#4d7c0f', '#7c3aed', '#0f766e', '#b91c1c'];

export function clusterColour(label: number | undefined): string {
  return label === undefined || label < 0 ? 'transparent' : (PALETTE[label % PALETTE.length] ?? '#888');
}
