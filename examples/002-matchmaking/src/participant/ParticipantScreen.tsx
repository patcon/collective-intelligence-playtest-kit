import { Button, Loader } from '@cloudflare/kumo';
import type { ReactNode } from 'react';
import { ActivityCard } from '../activity/ActivityCard.tsx';
import { CueChip } from '../cues/CueChip.tsx';
import { CueView } from '../cues/CueView.tsx';
import type { ParticipantView } from '../room/protocol.ts';
import { foundCount } from './foundCount.ts';

interface ParticipantScreenProps {
  /** Null until the room's first message. */
  view: ParticipantView | null;
  onFound: () => void;
  /** Something to know while waiting, such as the screen may sleep, or null. */
  note: string | null;
  /** Something to get ready for the next round, such as turning the sound up, or null. */
  notice: ReactNode;
}

function Message({ title, detail, note, notice }: { title: string; detail?: string; note?: string | null; notice?: ReactNode }) {
  return (
    <main className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-kumo-base p-8 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {detail && <p className="max-w-sm text-kumo-subtle">{detail}</p>}
      {notice}
      {note && <p className="max-w-sm text-sm text-kumo-subtle">{note}</p>}
    </main>
  );
}

/** What a participant sees once past the start screen, for each status the room gives them. */
export function ParticipantScreen({ view, onFound, note, notice }: ParticipantScreenProps) {
  switch (view?.status) {
    case undefined:
      return (
        <main className="fixed inset-0 grid place-items-center bg-kumo-base">
          <Loader />
        </main>
      );
    case 'joined':
    case 'waiting':
      return (
        <Message
          detail="You'll get a cue when the round starts. Find everyone with the same one."
          note={note}
          notice={notice}
          title="Waiting for the emcee…"
        />
      );
    case 'late':
      return <Message detail="This round has already started." note={note} notice={notice} title="You'll be matched next round" />;
    case 'matched':
      return (
        <CueView cue={view.cue}>
          <Button onClick={onFound} size="lg" variant="secondary">
            Found them
          </Button>
          <p className="text-lg">{foundCount(view.group, false)}</p>
        </CueView>
      );
    case 'found':
      return (
        <CueView cue={view.cue}>
          <p className="text-2xl font-semibold">{`You're a group of ${view.group.size}`}</p>
          <p className="text-lg">{foundCount(view.group, true)}</p>
        </CueView>
      );
    case 'activity':
      return (
        <main className="fixed inset-0 flex items-center justify-center bg-kumo-base p-8">
          <ActivityCard>
            <p className="flex items-center gap-2 font-medium">
              <CueChip cue={view.cue} />
              {`· your group of ${view.group.size}`}
            </p>
          </ActivityCard>
        </main>
      );
  }
}
