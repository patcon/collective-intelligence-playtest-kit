import { useAgent } from 'agents/react';
import { createContext, use, useState } from 'react';
import type { ReactNode } from 'react';
import { usePageVisibility } from '../hooks/effects/usePageVisibility.ts';
import { useSendWhenOpen } from '../hooks/effects/useSendWhenOpen.ts';
import { useSubscriber } from '../hooks/effects/useSubscriber.ts';

export type RoomStatus = 'connecting' | 'open' | 'closed';

interface RoomContextValue<In, Out> {
  send: (msg: Out) => void;
  status: RoomStatus;
  subscribers: Set<(msg: In) => void>;
}

export interface RoomProviderProps {
  /** The agent instance to join. */
  room: string;
  /** Sent as `?role=`, for the room to tag the connection with. */
  role: string;
  /** A fixed connection id, so the room knows this client again after a reload (see `sessionId`). */
  id?: string;
  /** Close the socket while the page is out of view, so the room hears it left straight away. */
  closeWhenHidden?: boolean;
  children: ReactNode;
}

interface RoomClientOptions<In> {
  /** The Agent class's name, as the Worker routes it. */
  agent: string;
  /** A message from the room, from raw socket text, or null to drop it. */
  parse: (raw: string) => In | null;
}

/**
 * The socket's scheme, matching the page's. PartySocket otherwise picks `ws` for private-network
 * hosts (192.168.*, 10.*), which an HTTPS page on the LAN blocks as mixed content.
 */
function socketProtocol(): 'ws' | 'wss' {
  return window.location.protocol === 'https:' ? 'wss' : 'ws';
}

/**
 * A provider and hooks for one kind of room: `In` is what the room sends, `Out` what this client sends.
 * Make one per example, at module level, and use what it returns in place of `useAgent`.
 */
export function createRoomClient<In, Out>({ agent, parse }: RoomClientOptions<In>) {
  const RoomContext = createContext<RoomContextValue<In, Out> | null>(null);

  function RoomProvider({ room, role, id, closeWhenHidden = false, children }: RoomProviderProps) {
    const [status, setStatus] = useState<RoomStatus>('connecting');
    const [subscribers] = useState(() => new Set<(msg: In) => void>());

    const socket = useAgent({
      agent,
      id,
      name: room,
      onClose: () => setStatus('closed'),
      onMessage: (event: MessageEvent) => {
        const msg = typeof event.data === 'string' ? parse(event.data) : null;
        if (msg !== null) {
          for (const subscriber of subscribers) {
            subscriber(msg);
          }
        }
      },
      onOpen: () => setStatus('open'),
      protocol: socketProtocol(),
      query: { role },
    });

    usePageVisibility(closeWhenHidden, (visible) => (visible ? socket.reconnect() : socket.close(1000, 'hidden')));

    /** Dropped unless the socket is open: nothing is queued for later. */
    const send = (msg: Out) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(msg));
      }
    };

    return <RoomContext value={{ send, status, subscribers }}>{children}</RoomContext>;
  }

  function useRoom(): RoomContextValue<In, Out> {
    const value = use(RoomContext);
    if (!value) {
      throw new Error(`useRoom must be used inside the ${agent} RoomProvider`);
    }
    return value;
  }

  return {
    RoomProvider,
    useRoom,
    /** Calls `callback` with every message the room sends, always the latest callback passed. */
    useRoomMessages: (callback: (msg: In) => void) => useSubscriber(useRoom().subscribers, callback),
    useRoomSend: () => useRoom().send,
    useRoomStatus: () => useRoom().status,
    /** Keeps the room up to date with `msg` (null: nothing yet), resending it on every reconnect. */
    useSendOnOpen: (msg: Out | null) => {
      const { send, status } = useRoom();
      useSendWhenOpen(status === 'open', send, msg);
    },
  };
}
