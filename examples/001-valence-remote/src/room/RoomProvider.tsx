import { useAgent } from 'agents/react';
import { createContext, use, useState } from 'react';
import type { ReactNode } from 'react';
import { parseRoomMessage } from './protocol.ts';
import type { Role, RoomMessage } from './protocol.ts';

export type RoomStatus = 'connecting' | 'open' | 'closed';

type Subscriber = (msg: RoomMessage) => void;

interface RoomContextValue {
  send: (msg: RoomMessage) => void;
  status: RoomStatus;
  subscribers: Set<Subscriber>;
}

const RoomContext = createContext<RoomContextValue | null>(null);

interface RoomProviderProps {
  room: string;
  role: Role;
  children: ReactNode;
}

/** Connects to a `ValenceRoom` as a phone or a viewer, and gives everything below it the room. */
export function RoomProvider({ room, role, children }: RoomProviderProps) {
  const [status, setStatus] = useState<RoomStatus>('connecting');
  const [subscribers] = useState(() => new Set<Subscriber>());

  const agent = useAgent({
    agent: 'ValenceRoom',
    name: room,
    onClose: () => setStatus('closed'),
    onMessage: (event: MessageEvent) => {
      const msg = typeof event.data === 'string' ? parseRoomMessage(event.data) : null;
      if (msg) {
        for (const subscriber of subscribers) {
          subscriber(msg);
        }
      }
    },
    onOpen: () => setStatus('open'),
    query: { role },
  });

  const send = (msg: RoomMessage) => agent.send(JSON.stringify(msg));

  return <RoomContext value={{ send, status, subscribers }}>{children}</RoomContext>;
}

export function useRoom(): RoomContextValue {
  const room = use(RoomContext);
  if (!room) {
    throw new Error('useRoom must be used inside a RoomProvider');
  }
  return room;
}

export function useRoomSend(): (msg: RoomMessage) => void {
  return useRoom().send;
}

export function useRoomStatus(): RoomStatus {
  return useRoom().status;
}
