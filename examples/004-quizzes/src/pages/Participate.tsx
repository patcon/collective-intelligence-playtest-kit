import { sessionId, useWakeLock } from '@playtest-kit/common';
import { RoomStatusBadge, StartScreen } from '@playtest-kit/ui';
import { useState } from 'react';
import type { ItemId } from '../items/items.ts';
import { AnsweringScreen } from '../participant/AnsweringScreen.tsx';
import { DoneScreen } from '../participant/DoneScreen.tsx';
import { WaitingScreen } from '../participant/WaitingScreen.tsx';
import { participantRoom } from '../room/client.ts';
import { ROOM } from '../room/protocol.ts';
import type { Answer, ParticipantView } from '../room/protocol.ts';

const { RoomProvider, useRoomMessages, useRoomSend, useRoomStatus, useSendOnOpen } = participantRoom;

const NO_WAKE_LOCK = "This browser can't keep the screen awake, so it may sleep while you wait. Tap it now and then.";

/** The answer an Undo cleared, so the screen it goes back to can show what was picked. */
interface Undone {
  item: ItemId;
  answer: Answer;
}

interface QuizScreenProps {
  view: ParticipantView | null;
  undone: Undone | null;
  onAnswer: (item: ItemId, answer: Answer) => void;
  onUndo: () => void;
}

/** The screen for where this participant is in the quiz. */
function QuizScreen({ view, undone, onAnswer, onUndo }: QuizScreenProps) {
  const item = view?.statements[view.position];
  if (view?.status === 'answering' && item !== undefined) {
    return (
      <AnsweringScreen
        item={item}
        onAnswer={(answer) => onAnswer(item, answer)}
        onUndo={onUndo}
        picked={undone?.item === item ? undone.answer : undefined}
        position={view.position}
        total={view.statements.length}
      />
    );
  }
  if (view?.status === 'done') {
    return <DoneScreen onUndo={onUndo} />;
  }
  return <WaitingScreen late={view?.status === 'late'} />;
}

function ParticipantFlow() {
  const [started, setStarted] = useState(false);
  const [view, setView] = useState<ParticipantView | null>(null);
  const [undone, setUndone] = useState<Undone | null>(null);
  const status = useRoomStatus();
  const send = useRoomSend();
  const wakeLock = useWakeLock(started);
  useRoomMessages((msg) => setView(msg.view));
  // Sent again on every reconnect, so a room that restarted still knows this participant is ready.
  useSendOnOpen(started ? { type: 'ready' } : null);

  if (!started) {
    return (
      <StartScreen
        instruction="You'll see a statement at a time. Say how well each describes you."
        onStart={() => setStarted(true)}
        title="Personality quiz"
        warning={wakeLock.supported ? null : NO_WAKE_LOCK}
      />
    );
  }

  const undo = () => {
    const previous = view?.statements[view.position - 1];
    const answer = previous === undefined ? undefined : view?.answers[previous];
    setUndone(previous !== undefined && answer !== undefined ? { answer, item: previous } : null);
    send({ type: 'undo' });
  };

  return (
    <>
      <QuizScreen onAnswer={(item, answer) => send({ answer, item, type: 'answer' })} onUndo={undo} undone={undone} view={view} />
      {status === 'open' ? null : (
        <div className="fixed top-4 right-4">
          <RoomStatusBadge status={status} />
        </div>
      )}
    </>
  );
}

/**
 * `/participate`: this device as someone taking the quiz. Its connection id is kept per tab, so a reload
 * comes back to the same statement with its answers. Only after the Start tap (which keeps the screen
 * awake) does it tell the room it's ready.
 */
export function Participate() {
  return (
    <RoomProvider id={sessionId('participant')} role="participant" room={ROOM}>
      <ParticipantFlow />
    </RoomProvider>
  );
}
