import { Button, Checkbox, Slider, Surface, Tabs } from '@cloudflare/kumo';
import { useOnChange } from '@playtest-kit/common';
import { useMemo, useState, useSyncExternalStore } from 'react';
import { useElementSize } from '../hooks/effects/useElementSize.ts';
import { useInterval } from '../hooks/effects/useInterval.ts';
import { ANSWER_SCALE, TRAITS, TRAIT_NAMES } from '../items/items.ts';
import type { Item, ItemId } from '../items/items.ts';
import type { Answer } from '../room/protocol.ts';
import { CLUSTER_ALGORITHMS, clusterColour, clusterPeople, countChanges, coveredColumns, damped, DEFAULT_CLUSTER_SETTINGS, matchLabels, MIN_STATEMENTS } from '../prototype/clusters.ts';
import type { ClusterSettings } from '../prototype/clusters.ts';
import { LABEL_WIDTH, Matrix, TRAIT_COLOURS } from '../prototype/Matrix.tsx';
import type { Hover } from '../prototype/Matrix.tsx';
import { COLUMN_ORDERS, columnOrderOf, orderColumns, orderRows, ROW_ORDERS, rowOrderOf } from '../prototype/orders.ts';
import type { ColumnOrder, RowOrder, SortBy } from '../prototype/orders.ts';
import { AnswerStream, STREAM_SPEEDS } from '../prototype/stream.ts';
import type { Participant, StreamSnapshot } from '../prototype/stream.ts';
import { mean, tableOf, valueOf } from '../prototype/table.ts';
import type { Shown, Table } from '../prototype/table.ts';

/**
 * PROTOTYPE, `/prototype`: the answers matrix rebuilt around orders. Answers stream in from a local simulation
 * (real people from the sample, no server), and rows and columns can be re-sorted, live or on demand, with each
 * move animated. Participants can be clustered with Leiden and sorted into their clusters.
 */

/** How often live orders and live clustering rerun, in ms. */
const LIVE_ORDER_MS = 900;
const LIVE_CLUSTER_MS = 2000;
const TICK_MS = 150;

const STATEMENT_COUNTS = [10, 25, 50];
const SHOWN_TABS = [
  { label: 'Answer', value: 'answer' },
  { label: 'Score', value: 'score' },
];

/** `order` with ids no longer present dropped and new ones appended, in `ids`' order. */
function carry<T extends string>(order: ReadonlyArray<T>, ids: ReadonlyArray<T>): Array<T> {
  const present = new Set(ids);
  const kept = order.filter((id) => present.has(id));
  const placed = new Set(kept);
  return [...kept, ...ids.filter((id) => !placed.has(id))];
}

/**
 * An order that's recomputed when `key` or `token` changes, and every `LIVE_ORDER_MS` while `live`; between
 * recomputes, new ids are appended at the end, so a frozen order stays put while data comes in.
 */
function useOrder<T extends string>(ids: ReadonlyArray<T>, compute: (prev: ReadonlyArray<T>) => Array<T>, key: string, token: number, live: boolean) {
  const [order, setOrder] = useState<ReadonlyArray<T>>([]);
  const update = () =>
    setOrder((prev) => {
      const next = compute(prev);
      return next.join() === prev.join() ? prev : next;
    });
  useOnChange(`${key}#${token}`, update);
  useInterval(update, live ? LIVE_ORDER_MS : null);
  return useMemo(() => carry(order, ids), [order, ids]);
}

function useStream() {
  const [stream] = useState(() => new AnswerStream(40, 25));
  const snapshot = useSyncExternalStore(stream.subscribe, stream.getSnapshot);
  useInterval(() => stream.tick(TICK_MS), TICK_MS);
  return { snapshot, stream };
}

function StreamControls({ stream, snapshot }: { stream: AnswerStream; snapshot: StreamSnapshot }) {
  const [people, setPeople] = useState(40);
  const [statements, setStatements] = useState(25);
  const answered = snapshot.participants.reduce((sum, p) => sum + p.answers.size, 0);
  const total = snapshot.participants.length * snapshot.statements.length;
  return (
    <Surface className="flex flex-col gap-3 rounded-lg p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Stream</h2>
        <span className="text-xs text-kumo-subtle tabular-nums">
          {snapshot.participants.length} people · {answered}/{total} answers{snapshot.done ? ' · done' : ''}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Tabs
          onValueChange={(value) => stream.setSpeed(Number(value))}
          tabs={STREAM_SPEEDS.map((s) => ({ label: `×${s}`, value: String(s) }))}
          value={String(stream.speed)}
        />
        <Button onClick={() => stream.addPeople(10)} size="sm" variant="secondary">
          +10 people
        </Button>
        <Button onClick={() => stream.finish()} size="sm" variant="secondary">
          Finish
        </Button>
      </div>
      <Slider label={`People on reset: ${people}`} max={200} min={5} onValueChange={(v) => typeof v === 'number' && setPeople(v)} value={people} />
      <div className="flex flex-wrap items-center gap-2">
        <Tabs
          onValueChange={(value) => setStatements(Number(value))}
          tabs={STATEMENT_COUNTS.map((n) => ({ label: `${n} statements`, value: String(n) }))}
          value={String(statements)}
        />
        <Button onClick={() => stream.reset(people, statements)} size="sm" variant="secondary">
          Reset
        </Button>
      </div>
    </Surface>
  );
}

function clock(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Steps back through the stream's log: every join and answer so far, one event per step. */
interface TimelineProps {
  head: StreamSnapshot;
  view: StreamSnapshot;
  cursor: number | null;
  playing: boolean;
  replaying: boolean;
  onSeek: (to: number | null) => void;
  onTogglePlay: () => void;
}

function Timeline({ head, view, cursor, playing, replaying, onSeek, onTogglePlay }: TimelineProps) {
  const at = cursor ?? head.events;
  const steps = [-10, -1, 1, 10];
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Timeline</span>
        {steps.map((step) => (
          <Button disabled={at + step < 0 || at + step > head.events} key={step} onClick={() => onSeek(at + step)} size="sm" variant="secondary">
            {step > 0 ? `+${step}` : `−${-step}`}
          </Button>
        ))}
        <Button disabled={cursor === null} onClick={() => onSeek(null)} size="sm" variant="secondary">
          Live
        </Button>
        <span className="text-xs text-kumo-subtle tabular-nums">
          {cursor === null ? (playing ? 'Live' : 'Live, paused') : `${replaying ? 'Replaying' : 'Paused'} at event ${at} of ${head.events}`} · {clock(view.time)} into the quiz (simulated)
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Button className="w-18 flex-none" onClick={onTogglePlay} size="sm" variant="primary">
          {playing ? 'Pause' : 'Play'}
        </Button>
        <div className="flex-1">
          <Scrubber at={at} live={head.events} onSeek={onSeek} total={head.total} />
        </div>
      </div>
    </div>
  );
}

/**
 * The whole quiz as one bar, like a video's: played up to the cursor, then what has happened but isn't shown
 * (up to live), then what's still to come. Dragging or clicking past live stops at live.
 */
function Scrubber({ at, live, total, onSeek }: { at: number; live: number; total: number; onSeek: (to: number) => void }) {
  const percent = (n: number) => `${(100 * n) / Math.max(1, total)}%`;
  return (
    <div className="relative h-6">
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-kumo-recessed">
        <div className="absolute inset-y-0 left-0 bg-kumo-line" style={{ width: percent(live) }} />
        <div className="absolute inset-y-0 left-0 bg-kumo-brand" style={{ width: percent(at) }} />
      </div>
      <div className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-kumo-brand" style={{ left: percent(live) }} title="Live" />
      <div className="pointer-events-none absolute top-1/2 size-3.5 -translate-1/2 rounded-full border-2 border-kumo-base bg-kumo-brand shadow" style={{ left: percent(at) }} />
      <input
        aria-label="Timeline"
        aria-valuetext={`Event ${at} of ${live} so far`}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
        max={Math.max(1, total)}
        min={0}
        onChange={(event) => onSeek(Math.min(Number(event.target.value), live))}
        step={1}
        type="range"
        value={at}
      />
    </div>
  );
}

function ClusterSummary({ snapshot, clusters }: { snapshot: StreamSnapshot; clusters: ReadonlyMap<string, number> }) {
  const groups = new Map<number, Array<StreamSnapshot['participants'][number]>>();
  for (const p of snapshot.participants) {
    const label = clusters.get(p.id) ?? -1;
    groups.set(label, [...(groups.get(label) ?? []), p]);
  }
  const labels = [...groups.keys()].filter((l) => l >= 0).toSorted((a, b) => a - b);
  if (labels.length === 0) {
    return <p className="text-xs text-kumo-subtle">No clusters yet.</p>;
  }
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-kumo-subtle">Mean trait score per cluster (bars from 1 to 5; the line is neutral, 3).</p>
      {labels.map((label) => {
        const members = groups.get(label) ?? [];
        return (
          <div className="flex items-center gap-2 text-xs" key={label}>
            <span className="inline-block size-3 rounded-sm" style={{ background: clusterColour(label) }} />
            <span className="w-10 tabular-nums">{members.length}</span>
            {TRAITS.map((trait) => {
              const scores = members.flatMap((p) => snapshot.statements.filter((s) => s.trait === trait).map((s) => valueOf(p.answers.get(s.id), s, 'score')));
              const m = mean(scores);
              return (
                <span className="relative h-3 w-12 rounded-sm bg-kumo-recessed" key={trait} title={`${TRAIT_NAMES[trait]}: ${m?.toFixed(2) ?? '–'}`}>
                  {m === null ? null : (
                    <span className="absolute inset-y-0 left-0 rounded-sm" style={{ background: TRAIT_COLOURS[trait], width: `${((m - 1) / 4) * 100}%` }} />
                  )}
                  <span className="absolute inset-y-0 left-1/2 w-px bg-kumo-line" />
                </span>
              );
            })}
          </div>
        );
      })}
      <div className="flex gap-2 pl-5 text-[10px] text-kumo-subtle">
        <span className="w-10" />
        {TRAITS.map((t) => (
          <span className="w-12 text-center" key={t}>
            {t}
          </span>
        ))}
      </div>
      {groups.has(-1) ? <p className="text-xs text-kumo-subtle">{groups.get(-1)?.length} not in a cluster (too few answers, or a group under 3).</p> : null}
    </div>
  );
}

function personLine(person: Participant, total: number, cluster: number): string {
  return `${person.name} (${person.person.country}), ${person.answers.size}/${total} answered${cluster >= 0 ? `, cluster ${cluster + 1}` : ''}`;
}

function answerLine(answer: Answer | undefined): string {
  if (answer === undefined) {
    return 'not answered yet';
  }
  return answer === null ? 'skipped' : (ANSWER_SCALE.find((a) => a.value === answer)?.label ?? String(answer));
}

/** A cell colour for a 1–5 value (or a skip), as a CSS value; none for no answer yet. */
function tintOf(value: number | null | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value === null ? 'var(--vote-mark)' : `var(--vote-${value})`;
}

function tinted(tint: string | undefined) {
  return tint ? { backgroundColor: `color-mix(in srgb, ${tint} 30%, transparent)`, borderLeftColor: tint } : undefined;
}

/**
 * The hovered statement, tinted with the colour of the answer as given, and its trait, tinted with the colour of
 * the score towards it: the same colour for most statements, opposite colours for a reversed one.
 */
function StatementLine({ statement, index, answer }: { statement: Item; index: number; answer: Answer | undefined }) {
  const score = answer === undefined ? undefined : valueOf(answer, statement, 'score');
  return (
    <>
      <span className="pm-quote" style={tinted(tintOf(answer))}>
        {index + 1}. “{statement.text}”
      </span>
      <span className="pm-quote" style={tinted(tintOf(score))}>
        {TRAIT_NAMES[statement.trait]}
        {statement.keyed === -1 ? ' (reversed)' : ''}
      </span>
    </>
  );
}

interface HoverInfoProps {
  hover: Hover;
  snapshot: StreamSnapshot;
  clusters: ReadonlyMap<string, number>;
}

/** What's under the pointer, stuck to the top of the page while the matrix scrolls: the person, the statement, the answer. */
function HoverInfo({ hover, snapshot, clusters }: HoverInfoProps) {
  const person = snapshot.participants.find((p) => p.id === hover.row);
  const index = snapshot.statements.findIndex((s) => s.id === hover.col);
  const statement = snapshot.statements[index];
  const answer = person && statement ? person.answers.get(statement.id) : undefined;
  return (
    <div className="pm-info -mx-4 flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 border-b border-kumo-line bg-kumo-base px-4 py-2 text-sm">
      {!person && !statement ? <span className="text-kumo-subtle">Hover a cell, a name or a column. Click a column’s number to sort people by it.</span> : null}
      {person ? <span>{personLine(person, snapshot.statements.length, clusters.get(person.id) ?? -1)}</span> : null}
      {statement ? <StatementLine answer={answer} index={index} statement={statement} /> : null}
      {person && statement ? <span className="font-medium">{answerLine(answer)}</span> : null}
    </div>
  );
}

/**
 * Where the page is in the stream: `cursor` null follows it live; a number shows the state after that many
 * events, with the stream paused so it doesn't run on unseen.
 */
function useTimeline(head: StreamSnapshot, stream: AnswerStream) {
  const [cursor, setCursor] = useState<number | null>(null);
  // While replaying, the simulated time the replay has reached; it plays the log back at the stream's speed.
  const [replay, setReplay] = useState<number | null>(null);
  const snapshot = useMemo(() => (cursor === null ? head : stream.snapshotAt(cursor)), [cursor, head, stream]);
  const goLive = () => {
    setReplay(null);
    setCursor(null);
    stream.setPaused(false);
  };
  const seek = (to: number | null) => {
    setReplay(null);
    if (to === null) {
      goLive();
      return;
    }
    stream.setPaused(true);
    setCursor(to >= head.events ? null : Math.max(0, to));
  };
  useInterval(
    () => {
      const t = (replay ?? 0) + TICK_MS * stream.speed;
      const count = stream.eventsUntil(t);
      if (count >= head.events) {
        goLive();
      } else {
        setReplay(t);
        setCursor(count);
      }
    },
    replay === null ? null : TICK_MS,
  );
  // One Play/Pause: live, it runs or pauses the stream; at an earlier point, it replays from there or stops.
  const playing = cursor === null ? !stream.paused : replay !== null;
  const togglePlay = () => {
    if (cursor === null) {
      stream.setPaused(!stream.paused);
    } else {
      setReplay(replay === null ? snapshot.time : null);
    }
  };
  return { cursor, playing, replaying: replay !== null, seek, snapshot, togglePlay };
}

/** Leiden clusters of `table`, rerun live or on demand, with their colours kept steady from run to run. */
function useClustering(table: Table, cursor: number | null) {
  const [clusterSettings, setClusterSettings] = useState<ClusterSettings>(DEFAULT_CLUSTER_SETTINGS);
  const [autoCluster, setAutoCluster] = useState(true);
  const [clusters, setClusters] = useState<ReadonlyMap<string, number>>(new Map());
  const [changes, setChanges] = useState<ReturnType<typeof countChanges> | null>(null);
  // The last run's own result, before damping: a move is made once two runs in a row propose it.
  const [proposal, setProposal] = useState<ReadonlyMap<string, number>>(new Map());
  const recluster = () => {
    const proposed = matchLabels(clusters, clusterPeople(table, clusterSettings, clusters));
    const next = clusterSettings.damp ? damped(clusters, proposed, proposal) : proposed;
    setProposal(proposed);
    setChanges(countChanges(clusters, next));
    setClusters(next);
  };
  useOnChange(clusterSettings, recluster);
  useOnChange(cursor, () => autoCluster && recluster());
  useInterval(recluster, autoCluster ? LIVE_CLUSTER_MS : null);
  const covered = coveredColumns(table, clusterSettings.minCoverage).length;
  return { autoCluster, changes, clusterSettings, clusters, covered, recluster, setAutoCluster, setClusterSettings };
}

interface ClusterPanelProps {
  clustering: ReturnType<typeof useClustering>;
  snapshot: StreamSnapshot;
  statementCount: number;
  /** Clusters, and the order by them, are both already kept up to date. */
  redundantSort: boolean;
  onClusterAndSort: () => void;
}

function ClusterPanel({ clustering, snapshot, statementCount, redundantSort, onClusterAndSort }: ClusterPanelProps) {
  const { autoCluster, changes, clusterSettings, clusters, covered, recluster, setAutoCluster, setClusterSettings } = clustering;
  return (
    <Surface className="flex flex-col gap-3 rounded-lg p-4">
      <h2 className="font-semibold">Clusters (Leiden)</h2>
      <div className="flex flex-wrap items-center gap-3">
        <Checkbox checked={autoCluster} label="Recluster live" onCheckedChange={(checked) => setAutoCluster(checked === true)} />
        <Button disabled={autoCluster} onClick={recluster} size="sm" variant="secondary">
          Recluster
        </Button>
        <Button disabled={redundantSort} onClick={onClusterAndSort} size="sm"
          variant="primary"
        >
          Cluster & sort
        </Button>
      </div>
      <Slider
        label={`Resolution: ${clusterSettings.resolution.toFixed(1)} (higher, more and smaller clusters)`}
        max={3}
        min={0.1}
        onValueChange={(v) => typeof v === 'number' && setClusterSettings((s) => ({ ...s, resolution: v }))}
        step={0.1}
        value={clusterSettings.resolution}
      />
      <Slider
        label={`Neighbours (k): ${clusterSettings.k}`}
        max={30}
        min={3}
        onValueChange={(v) => typeof v === 'number' && setClusterSettings((s) => ({ ...s, k: v }))}
        value={clusterSettings.k}
      />
      <Tabs
        onValueChange={(value) => setClusterSettings((s) => ({ ...s, algorithm: value === 'leiden' ? 'leiden' : 'warm' }))}
        tabs={[...CLUSTER_ALGORITHMS]}
        value={clusterSettings.algorithm}
      />
      <Checkbox
        checked={clusterSettings.damp}
        label="Damp moves: change someone's cluster only when two runs in a row agree"
        onCheckedChange={(checked) => setClusterSettings((s) => ({ ...s, damp: checked === true }))}
      />
      <Slider
        label={`Only statements answered by ≥ ${Math.round(clusterSettings.minCoverage * 100)}% of people`}
        max={100}
        min={0}
        onValueChange={(v) => typeof v === 'number' && setClusterSettings((s) => ({ ...s, minCoverage: v / 100 }))}
        step={5}
        value={Math.round(clusterSettings.minCoverage * 100)}
      />
      <p className="text-xs text-kumo-subtle">
        {covered >= MIN_STATEMENTS
          ? `Clustering on ${covered} of ${statementCount} statements.`
          : `Holding off: ${covered} statements answered by that many, ${MIN_STATEMENTS} needed.`}
        {changes && changes.both > 0 ? ` Last recluster: ${changes.changed} of ${changes.both} people changed cluster.` : ''}
      </p>
      <ClusterSummary clusters={clusters} snapshot={snapshot} />
    </Surface>
  );
}

/**
 * The cell size: square cells of `cell` pixels, or, with `fill`, rows `cell` high and columns widened to fill the
 * width of the box the matrix sits in (in whole pixels, so the 1px gaps stay even).
 */
function useCellSizing() {
  const [cell, setCell] = useState(14);
  const [fill, setFill] = useState(false);
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const available = useElementSize(fill ? box : null)?.width;
  const sizeFor = (columns: number) =>
    available === undefined || columns === 0
      ? { height: cell, width: cell }
      : { height: cell, width: Math.max(3, Math.floor((available - LABEL_WIDTH) / columns)) };
  return { cell, fill, setBox, setCell, setFill, sizeFor };
}

export function MatrixPrototype() {
  const { snapshot: head, stream } = useStream();
  const timeline = useTimeline(head, stream);
  const { cursor, seek, snapshot } = timeline;
  const [shown, setShown] = useState<Shown>('score');
  const { cell, fill, setBox, setCell, setFill, sizeFor } = useCellSizing();
  const [hover, setHover] = useState<Hover>({ col: null, row: null });

  const [rowOrderName, setRowOrderName] = useState<RowOrder>('clusters');
  const [colOrderName, setColOrderName] = useState<ColumnOrder>('seen');
  const [sortBy, setSortBy] = useState<SortBy | null>(null);
  const [live, setLive] = useState(true);
  const [token, setToken] = useState(0);

  const table = useMemo(() => tableOf(snapshot, shown), [snapshot, shown]);
  const clustering = useClustering(table, cursor);
  const { clusters } = clustering;
  // "Cluster & sort" re-sorts once the new clusters are in, even with live re-sorting off.
  const [sortWhenClustered, setSortWhenClustered] = useState(false);
  useOnChange(clusters, () => {
    if (sortWhenClustered) {
      setSortWhenClustered(false);
      setToken((t) => t + 1);
    }
  });


  const rowOrder = useOrder(
    table.rowIds,
    (prev) => orderRows(rowOrderName, table, prev, { clusters, sortBy }),
    `${rowOrderName}:${sortBy?.id}:${sortBy?.dir}:${shown}`,
    token,
    live,
  );
  const colOrder = useOrder(
    table.colIds,
    (prev) => orderColumns(colOrderName, table, snapshot.statements, prev),
    `${colOrderName}:${shown}:${snapshot.statements.length}`,
    token,
    live,
  );

  const sortByStatement = (id: ItemId) => {
    setSortBy((prev) => ({ dir: prev?.id === id && rowOrderName === 'statement' ? (prev.dir === 1 ? -1 : 1) : 1, id }));
    setRowOrderName('statement');
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-400 flex-col gap-4 p-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Answers matrix: prototype</h1>
        <p className="max-w-3xl text-sm text-kumo-subtle">
          Simulated answers (real people from the IPIP-FFM sample) stream in. Sort rows and columns, live or on demand, and cluster people with Leiden
          (k nearest neighbours by answers). Nothing here talks to the room.{' '}
          <a className="underline" href="/demo">
            Back to the demo
          </a>
        </p>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <StreamControls snapshot={head} stream={stream} />
        <Surface className="flex flex-col gap-3 rounded-lg p-4">
          <h2 className="font-semibold">Order</h2>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium">People</span>
            <Tabs
              onValueChange={(value) => setRowOrderName(rowOrderOf(value) ?? 'joined')}
              tabs={[...ROW_ORDERS, ...(sortBy ? [{ label: `By ${sortBy.id} ${sortBy.dir === 1 ? '▼' : '▲'}`, value: 'statement' }] : [])]}
              value={rowOrderName}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium">Statements</span>
            <Tabs onValueChange={(value) => setColOrderName(columnOrderOf(value) ?? 'seen')} tabs={[...COLUMN_ORDERS]} value={colOrderName} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Checkbox checked={live} label="Re-sort live" onCheckedChange={(checked) => setLive(checked === true)} />
            <Button disabled={live} onClick={() => setToken((t) => t + 1)} size="sm" variant="secondary">
              Re-sort now
            </Button>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium">Cells show</span>
            <Tabs onValueChange={(value) => setShown(value === 'answer' ? 'answer' : 'score')} tabs={SHOWN_TABS} value={shown} />
          </div>
          <Slider label={fill ? `Row height: ${cell}px` : `Cell size: ${cell}px`} max={24} min={4} onValueChange={(v) => typeof v === 'number' && setCell(v)} value={cell} />
          <Checkbox checked={fill} label="Fill the width (cells no longer square)" onCheckedChange={(checked) => setFill(checked === true)} />
        </Surface>
        <ClusterPanel
          clustering={clustering}
          onClusterAndSort={() => {
            setRowOrderName('clusters');
            setSortWhenClustered(true);
            clustering.recluster();
          }}
          redundantSort={clustering.autoCluster && live && rowOrderName === 'clusters'}
          snapshot={snapshot}
          statementCount={table.colIds.length}
        />
      </div>

      <Surface className="flex flex-col gap-3 rounded-lg p-4">
        <Timeline cursor={cursor} head={head} onSeek={seek} onTogglePlay={timeline.togglePlay} playing={timeline.playing} replaying={timeline.replaying} view={snapshot} />
        <HoverInfo clusters={clusters} hover={hover} snapshot={snapshot} />
        <div className="overflow-x-auto" ref={setBox}>
          <Matrix
            clusters={clusters}
            colOrder={colOrder}
            hover={hover}
            onHover={setHover}
            onSortBy={sortByStatement}
            rowOrder={rowOrder}
            shown={shown}
            size={sizeFor(colOrder.length)}
            snapshot={snapshot}
            sortBy={rowOrderName === 'statement' ? sortBy : null}
          />
        </div>
      </Surface>
    </main>
  );
}
