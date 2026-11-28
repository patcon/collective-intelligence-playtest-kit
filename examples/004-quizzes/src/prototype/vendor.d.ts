// PROTOTYPE. Just the parts of these untyped libraries the prototype calls.

declare module 'reorder.js' {
  export interface ClusterNode {
    id: number;
    left: ClusterNode | null;
    right: ClusterNode | null;
  }
  /** Agglomerative clustering of the matrix's rows; leaves' ids are row indices. */
  export function hcluster(): ((matrix: Array<Array<number>>) => ClusterNode) & {
    linkage(name: 'single' | 'complete' | 'average'): ((matrix: Array<Array<number>>) => ClusterNode);
  };
  /** Correspondence analysis: permutations of the rows and of the columns, together. */
  export function ca_order(matrix: Array<Array<number>>): { rows: Array<number>; cols: Array<number> };
}

declare module 'ngraph.leiden' {
  import type { Graph } from 'ngraph.graph';
  export interface Clusters {
    getClass(nodeId: string): number;
    getCommunities(): Map<number, Array<string>>;
    quality(): number;
  }
  export function detectClusters(
    graph: Graph,
    options?: { quality?: 'modularity' | 'cpm'; resolution?: number; randomSeed?: number; refine?: boolean },
  ): Clusters;
}
