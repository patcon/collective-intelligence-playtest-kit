# PROTOTYPE: the response matrix

Throwaway code, kept on the `prototype/response-matrix` branch as a primary source. Main keeps only the decisions
below; the real component is built from them, not from this code.

Run it: `pnpm dev` in `examples/004-quizzes`, then open `/prototype`. Answers stream in from a local simulation
(real people from the IPIP-FFM sample); nothing talks to the room.

## The question

How should the people × statements matrix be built, so that answers can stream in, people and statements can be
re-sorted (live or on demand) with the moves animated, and people can be clustered live, without positions or
cluster labels thrashing as the data changes?

## Verdicts

**Drawing and animation**

- Place every cell absolutely and move it with CSS transforms; a new order is a transition, not a re-layout. Each
  column's x is a custom property on the root (`--x-<id>`), so a column reorder changes one style. Delaying each
  move by its new position gives Bostock's ripple. 200 people × 50 statements stays usable (worst frame 136ms, dev
  build).
- One alignment rule: each row and column gets a slot; everything in it fills the slot less the gap. Highlights are
  the box size, so their 1px outline falls in the gaps. Width and height are separate, which gives fill-width,
  rows locked to 200px in all, and a gaps toggle for free.
- Hover comes from the pointer position through the orders, not from the element hit, so the gaps count as cells
  and the highlight doesn't flicker. Highlights jump; animating them glitched when the pointer changed direction.
- Blank dots and skip marks are sized by the cell's narrower side, so they keep their shape in wide cells.

**Orders**

- Carry the previous order forward: new people append at the end, and sorts break ties by the previous order, so a
  re-sort moves things a little, not all.
- Similar order: reorder.js average-linkage clustering, with each merge's halves oriented towards the previous
  order. Optimal leaf ordering was too slow (1.4s at 150 people); this takes about 25–46ms at 200.
- CA order: aligned to the previous order by flipping whichever way moves less.
- PC1 is useful as a secondary order (within clusters, and for ties), signed to rise with the person's mean.
- Statements by variance is the useful "divisive" view.

**Clustering**

- k-nearest-neighbour graph (Gaussian weights scaled by the median distance) with Leiden's Constant Potts Model,
  resolution scaled by the graph's density. ngraph.leiden's modularity mode ignored the resolution.
- Wait until enough statements are answered by enough people (50% by default) before clustering.
- Starting from the current clusters (local moving under CPM, then splitting disconnected clusters) is what makes
  live clustering calm: about 8%, 4% and 2% of people change cluster per run (early, mid, late), against 27–34%
  for Leiden from scratch, and 6–8% for from-scratch with damping (move only when two runs agree).
- Keep labels (and so colours) steady with Jaccard overlap and the Hungarian algorithm. Order clusters by label, so
  blocks stay put.
- The people left out of every cluster are outliers (far from their nearest neighbours), not a bug; groups under
  3 show as no cluster.
- Outlining the hovered person's whole cluster (hovering the names column), flush outside its cells, makes groups
  easy to see in any order.

**Shape of the real thing**

- The component draws; it computes nothing. It takes rows, columns, computed orders (not order names), row groups
  as annotations, a layout, and the existing hover store (which this prototype doesn't use: it re-renders on
  hover). Like single-cell tooling's split between tools (`tl.leiden`) and plotting (`pl.heatmap(groupby=…)`).
- The table, orders, clustering, warm start and Hungarian matching become pure modules, with tests. Two hooks
  join them to live data: one carrying orders forward, one running clustering with the gate, damping and label
  matching.

## Left open

- The component's name: rework `VoteMatrix`, or a new one.
- Whether the timeline (step back, replay) graduates; it needs an event log in the room.
- Where clustering runs (main thread is fine at 200 people; a worker later, without changing the component).
