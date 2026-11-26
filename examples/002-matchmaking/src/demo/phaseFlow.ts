import { PALETTE } from '../cues/colour/colourCue.ts';
import type { RoomSnapshot } from '../room/protocol.ts';
import type { ParticipantStatus } from '../room/roomViews.ts';

/** The stages everyone moves through, left to right, each a column on the emcee's pane. */
export type Stage = 'starting' | 'waiting' | 'looking' | 'found' | 'activity';

export const STAGES: ReadonlyArray<Stage> = ['starting', 'waiting', 'looking', 'found', 'activity'];

/** Where each status sits. Someone `late` waits with the rest, for the next round. */
const STAGE_OF: Record<ParticipantStatus, Stage> = {
  activity: 'activity',
  found: 'found',
  joined: 'starting',
  late: 'waiting',
  matched: 'looking',
  waiting: 'waiting',
};

export interface StageMember {
  id: string;
  status: ParticipantStatus;
  /** Index into the snapshot's groups, or null when not in one. */
  group: number | null;
}

/** Members of a group side by side, in group order; those waiting before those late. */
function byGroup(a: StageMember, b: StageMember): number {
  return (a.group ?? -1) - (b.group ?? -1) || Number(a.status === 'late') - Number(b.status === 'late');
}

/** Everyone in the room, by stage, with each group's members together, otherwise in the order they joined. */
export function phaseFlow(snapshot: RoomSnapshot): Record<Stage, Array<StageMember>> {
  const flow: Record<Stage, Array<StageMember>> = { activity: [], found: [], looking: [], starting: [], waiting: [] };
  for (const { id, status, group } of snapshot.participants) {
    flow[STAGE_OF[status]].push({ group, id, status });
  }
  for (const stage of STAGES) {
    flow[stage].sort(byGroup);
  }
  return flow;
}

/**
 * A group's colour on the emcee's pane: its cue's colour when the round is cued by colour, so the
 * dots match the phones; otherwise the same palette, in group order.
 */
export function groupColour(snapshot: RoomSnapshot, group: number): string {
  const cue = snapshot.groups[group]?.cue;
  return cue?.type === 'colour' ? cue.hex : (PALETTE[group % PALETTE.length]?.hex ?? 'currentColor');
}
