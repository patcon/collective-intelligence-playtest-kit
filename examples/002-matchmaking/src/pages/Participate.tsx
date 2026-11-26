import { sessionId, unlockAudio, useWakeLock } from '@playtest-kit/common';
import { RoomStatusBadge, StartScreen } from '@playtest-kit/ui';
import { useState } from 'react';
import { CUE_TYPES } from '../cues/cueTypes.ts';
import type { CueTypeId } from '../cues/cueTypes.ts';
import { ParticipantScreen } from '../participant/ParticipantScreen.tsx';
import { SOUND_NOTICE, SoundNotice } from '../participant/SoundNotice.tsx';
import { participantRoom } from '../room/client.ts';
import type { ParticipantView } from '../room/protocol.ts';

const { RoomProvider, useRoomMessages, useRoomSend, useRoomStatus, useSendOnOpen } = participantRoom;

const NO_WAKE_LOCK = "This browser can't keep the screen awake, so it may sleep while you wait. Tap it now and then.";
const LOST_WAKE_LOCK = 'Your screen may sleep while you wait. Tap it now and then.';

/** Everything the start screen should warn about, as one line, or null. */
function startWarning(soundNext: boolean, canKeepAwake: boolean): string | null {
  const warnings = [soundNext ? SOUND_NOTICE : null, canKeepAwake ? null : NO_WAKE_LOCK].filter((w) => w !== null);
  return warnings.length > 0 ? warnings.join(' ') : null;
}

function ParticipantFlow() {
  const [started, setStarted] = useState(false);
  const [view, setView] = useState<ParticipantView | null>(null);
  const [nextCue, setNextCue] = useState<CueTypeId | null>(null);
  const status = useRoomStatus();
  const send = useRoomSend();
  const wakeLock = useWakeLock(started);
  useRoomMessages((msg) => {
    setView(msg.view);
    setNextCue(msg.nextCue);
  });
  const soundNext = nextCue !== null && CUE_TYPES[nextCue].sense === 'audio';
  // Sent again on every reconnect, so a room that restarted still knows this participant is ready.
  useSendOnOpen(started ? { type: 'ready' } : null);

  if (!started) {
    return (
      <StartScreen
        instruction="When the round starts you'll get a cue. Find everyone with the same one."
        onStart={() => {
          unlockAudio();
          setStarted(true);
        }}
        title="Matchmaking"
        warning={startWarning(soundNext, wakeLock.supported)}
      />
    );
  }

  return (
    <>
      <ParticipantScreen
        note={wakeLock.supported && !wakeLock.acquired ? LOST_WAKE_LOCK : null}
        notice={soundNext ? <SoundNotice /> : null}
        onFound={(found) => send({ found, type: 'found' })}
        view={view}
      />
      {status === 'open' ? null : (
        <div className="fixed top-4 right-4">
          <RoomStatusBadge status={status} />
        </div>
      )}
    </>
  );
}

/**
 * `/participate`: this device as someone being matched. Its connection id is kept per tab, so a
 * reload comes back to the same group and cue. Only after the Start tap (which unlocks audio and
 * keeps the screen awake) does it tell the room it's ready to be matched.
 */
export function Participate({ room }: { room: string }) {
  return (
    <RoomProvider id={sessionId('participant')} role="participant" room={room}>
      <ParticipantFlow />
    </RoomProvider>
  );
}
