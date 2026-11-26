import { Loader } from '@cloudflare/kumo';
import { RoomStatusBadge } from '@playtest-kit/ui';
import { useState } from 'react';
import { ConfigPanels } from '../demo/ConfigPanels.tsx';
import { EmceePane } from '../demo/EmceePane.tsx';
import { JoinPanel } from '../demo/JoinPanel.tsx';
import { ParticipantCards } from '../demo/ParticipantCards.tsx';
import { PhoneFrame } from '../demo/PhoneFrame.tsx';
import { repeatWarning } from '../demo/repeatWarning.ts';
import { hostRoom } from '../room/client.ts';
import type { RoomSnapshot } from '../room/protocol.ts';
import { SimControls } from '../simulation/SimControls.tsx';
import { useSimulation } from '../simulation/useSimulation.ts';
import type { Simulation } from '../simulation/useSimulation.ts';

const { RoomProvider, useRoomMessages, useRoomSend, useRoomStatus } = hostRoom;

function Dashboard({ snapshot, simulation }: { snapshot: RoomSnapshot; simulation: Simulation }) {
  const send = useRoomSend();
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <ConfigPanels config={snapshot.config} onConfig={(config) => send({ config, type: 'config' })} warning={repeatWarning(snapshot)} />
          <div className="flex flex-col gap-4">
            <JoinPanel />
            <SimControls simulation={simulation} />
          </div>
        </div>
        <h2 className="text-lg font-semibold">Participants</h2>
        <ParticipantCards
          onSimFound={simulation.found}
          simNames={new Map(simulation.sims.map((sim) => [sim.id, sim.name]))}
          snapshot={snapshot}
        />
      </div>
      {/* Kept in view while the participant cards scroll, since it's what the emcee is using. */}
      <div className="shrink-0 md:sticky md:top-4 md:w-92">
        <PhoneFrame label="The emcee's phone">
          <EmceePane onCommand={send} snapshot={snapshot} />
        </PhoneFrame>
      </div>
    </div>
  );
}

function HostView({ room }: { room: string }) {
  const status = useRoomStatus();
  const simulation = useSimulation(room);
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  useRoomMessages((msg) => setSnapshot(msg.snapshot));

  return (
    <main className="mx-auto flex min-h-screen max-w-400 flex-col gap-4 p-4">
      <header className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Matchmaking</h1>
        <RoomStatusBadge status={status} />
      </header>
      {snapshot ? <Dashboard simulation={simulation} snapshot={snapshot} /> : <Loader />}
    </main>
  );
}

/**
 * `/demo-ui`: the room, as the host running it, left to right in the order it's used: config, then
 * joining and simulated participants, with a card for everyone in the room below them, then the
 * emcee's pane on a phone, on the right and in view once the screen is wide enough for two columns.
 */
export function DemoUi({ room }: { room: string }) {
  return (
    <RoomProvider role="host" room={room}>
      <HostView room={room} />
    </RoomProvider>
  );
}
