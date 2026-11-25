import { Button, Loader } from '@cloudflare/kumo';
import { CueView } from '../cues/CueView.tsx';
import type { ParticipantView } from '../room/protocol.ts';

interface ParticipantScreenProps {
  /** Null until the room's first message. */
  view: ParticipantView | null;
  onFound: () => void;
  /** Something to know while waiting, such as the screen may sleep, or null. */
  note: string | null;
}

function Message({ title, detail, note }: { title: string; detail?: string; note?: string | null }) {
  return (
    <main className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-kumo-base p-8 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {detail && <p className="max-w-sm text-kumo-subtle">{detail}</p>}
      {note && <p className="max-w-sm text-sm text-kumo-subtle">{note}</p>}
    </main>
  );
}

/** "x of N found", for everyone in a group to watch go up. */
function foundCount({ found, size }: { found: number; size: number }): string {
  return `${found} of ${size} found`;
}

/** What a participant sees once past the start screen, for each status the room gives them. */
export function ParticipantScreen({ view, onFound, note }: ParticipantScreenProps) {
  switch (view?.status) {
    case undefined:
      return (
        <main className="fixed inset-0 grid place-items-center bg-kumo-base">
          <Loader />
        </main>
      );
    case 'joined':
    case 'waiting':
      return <Message detail="You'll get a cue when the round starts. Find everyone with the same one." note={note} title="Waiting for the emcee…" />;
    case 'late':
      return <Message detail="This round has already started." note={note} title="You'll be matched next round" />;
    case 'matched':
      return (
        <CueView cue={view.cue}>
          <Button onClick={onFound} size="lg" variant="secondary">
            Found them
          </Button>
          <p className="text-lg">{foundCount(view.group)}</p>
        </CueView>
      );
    case 'found':
      return (
        <CueView cue={view.cue}>
          <p className="text-2xl font-semibold">{`You're a group of ${view.group.size}`}</p>
          <p className="text-lg">{foundCount(view.group)}</p>
        </CueView>
      );
  }
}
