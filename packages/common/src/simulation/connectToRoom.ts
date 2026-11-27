import { AgentClient } from 'agents/client';
import { socketProtocol } from '../room/socketProtocol.ts';
import type { ConnectSim } from './simSocket.ts';

/** Connects simulated participants to `room` of `agent` on this page's own server, as phones do, but headless. */
export function connectToRoom(agent: string, room: string, role = 'participant'): ConnectSim {
  return (id, { onOpen, onMessage }) => {
    const socket = new AgentClient({
      agent,
      host: window.location.host,
      id,
      name: room,
      protocol: socketProtocol(),
      query: { role },
    });
    socket.addEventListener('open', onOpen);
    socket.addEventListener('message', (event: MessageEvent) => typeof event.data === 'string' && onMessage(event.data));
    return { close: () => socket.close(), send: (text) => socket.send(text) };
  };
}
