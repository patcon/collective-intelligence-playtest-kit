import { Badge, Button, Empty, Surface } from '@cloudflare/kumo';
import type { BadgeVariant } from '@cloudflare/kumo';
import { CueChip } from '../cues/CueChip.tsx';
import type { RoomSnapshot } from '../room/protocol.ts';
import type { ParticipantStatus } from '../room/roomViews.ts';

type Participant = RoomSnapshot['participants'][number];

interface ParticipantCardsProps {
  snapshot: RoomSnapshot;
  /** Names of this page's simulated participants, by id. Anyone else is a phone. */
  simNames: ReadonlyMap<string, string>;
  /** Taps "found them" for a simulated participant. */
  onSimFound: (id: string) => void;
}

const STATUS: Record<ParticipantStatus, { label: string; variant: BadgeVariant }> = {
  activity: { label: 'in activity', variant: 'beta' },
  found: { label: 'found', variant: 'success' },
  joined: { label: 'starting', variant: 'secondary' },
  late: { label: 'late', variant: 'warning' },
  matched: { label: 'looking', variant: 'primary' },
  waiting: { label: 'waiting', variant: 'info' },
};

function ParticipantCard({ participant, snapshot, simName, onSimFound }: { participant: Participant; snapshot: RoomSnapshot; simName: string | undefined; onSimFound: (id: string) => void }) {
  const { label, variant } = STATUS[participant.status];
  const group = participant.group === null ? undefined : snapshot.groups[participant.group];
  return (
    <Surface className="flex flex-col gap-2 rounded-lg p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{simName ?? `Phone ${participant.id.slice(0, 4)}`}</span>
        <Badge variant={variant}>{label}</Badge>
      </div>
      <div className="flex min-h-5 items-center justify-between gap-2 text-sm text-kumo-subtle">
        {group && participant.group !== null ? (
          <>
            <CueChip cue={group.cue} />
            <span>Group {participant.group + 1}</span>
          </>
        ) : (
          <span>{simName ? 'simulated' : 'phone'}</span>
        )}
      </div>
      {simName && (
        <Button disabled={participant.status !== 'matched'} onClick={() => onSimFound(participant.id)} size="sm">
          Found them
        </Button>
      )}
    </Surface>
  );
}

/** Everyone connected, real or simulated, as the room sees them. Only simulated ones get a "found them" button. */
export function ParticipantCards({ snapshot, simNames, onSimFound }: ParticipantCardsProps) {
  if (snapshot.participants.length === 0) {
    return <Empty description="Scan the QR code with a phone, or add simulated participants." title="No one here yet" />;
  }
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3">
      {snapshot.participants.map((p) => (
        <ParticipantCard key={p.id} onSimFound={onSimFound} participant={p} simName={simNames.get(p.id)} snapshot={snapshot} />
      ))}
    </div>
  );
}
