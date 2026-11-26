import { socketProtocol } from '@playtest-kit/common';
import { AgentClient } from 'agents/client';
import { AGENT } from '../room/protocol.ts';
import type { ConnectSim } from './SimulatedParticipant.ts';

/** Connects simulated participants to `room` on this page's own server, as phones do, but headless. */
export function connectToRoom(room: string): ConnectSim {
  return (id, { onOpen, onMessage }) => {
    const socket = new AgentClient({
      agent: AGENT,
      host: window.location.host,
      id,
      name: room,
      protocol: socketProtocol(),
      query: { role: 'participant' },
    });
    socket.addEventListener('open', onOpen);
    socket.addEventListener('message', (event: MessageEvent) => typeof event.data === 'string' && onMessage(event.data));
    return { close: () => socket.close(), send: (text) => socket.send(text) };
  };
}
