import { Button, Loader } from '@cloudflare/kumo';
import { RoomStatusBadge } from '@playtest-kit/ui';
import type { ReactNode } from 'react';
import { ConfigPanels } from '../demo/ConfigPanels.tsx';
import { EmceePane } from '../demo/EmceePane.tsx';
import { JoinPanel } from '../demo/JoinPanel.tsx';
import { ParticipantCards } from '../demo/ParticipantCards.tsx';
import { PhoneFrame } from '../demo/PhoneFrame.tsx';
import { repeatWarning } from '../demo/repeatWarning.ts';
import { straySimIds } from '../demo/straySimIds.ts';
import { hostRoom } from '../room/client.ts';
import type { RoomSnapshot } from '../room/protocol.ts';
import { useRoomSnapshot } from '../room/useRoomSnapshot.ts';
import { SimControls } from '../simulation/SimControls.tsx';
import { useSimulation } from '../simulation/useSimulation.ts';
import type { Simulation } from '../simulation/useSimulation.ts';

const { RoomProvider, useRoomSend, useRoomStatus } = hostRoom;

/** The page's panels, with `header` above those on the left, so the phone's column reaches the top. */
function Dashboard({ header, snapshot, simulation }: { header: ReactNode; snapshot: RoomSnapshot; simulation: Simulation }) {
  const send = useRoomSend();
  const simNames = new Map(simulation.sims.map((sim) => [sim.id, sim.name]));
  const strays = straySimIds(snapshot, new Set(simNames.keys()));
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {header}
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <ConfigPanels config={snapshot.config} onConfig={(config) => send({ config, type: 'config' })} warning={repeatWarning(snapshot)} />
          <div className="flex flex-col gap-4">
            <JoinPanel />
            <SimControls simulation={simulation} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Participants</h2>
          {/* A catch for sims another tab, or a page that lost track of them, left connected. */}
          {strays.length > 0 && (
            <Button onClick={() => send({ ids: strays, type: 'remove' })} size="xs" variant="secondary">
              {`Clear ${strays.length} stray ${strays.length === 1 ? 'sim' : 'sims'}`}
            </Button>
          )}
        </div>
        <ParticipantCards onSimFound={simulation.found} simNames={simNames} snapshot={snapshot} />
      </div>
      {/* Kept in view while the participant cards scroll, since it's what the emcee is using. */}
      <div className="shrink-0 md:sticky md:top-4 md:w-92">
        <PhoneFrame label="The emcee's phone" url={`${window.location.origin}/emcee`}>
          <EmceePane onCommand={send} snapshot={snapshot} />
        </PhoneFrame>
      </div>
    </div>
  );
}

function HostView({ room }: { room: string }) {
  const status = useRoomStatus();
  const simulation = useSimulation(room);
  const snapshot = useRoomSnapshot();

  const header = (
    <header className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Matchmaking</h1>
        <RoomStatusBadge status={status} />
      </div>
      <p className="max-w-2xl text-sm text-kumo-subtle">
        Splits a room into small groups at random. Each group gets a cue (a colour, an avatar, a birdsong or a vibration), and people find
        everyone else with the same cue, then tick “Found them” to start an activity.
      </p>
    </header>
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-400 flex-col gap-4 p-4">
      {snapshot ? (
        <Dashboard header={header} simulation={simulation} snapshot={snapshot} />
      ) : (
        <>
          {header}
          <Loader />
        </>
      )}
    </main>
  );
}

/**
 * `/demo`: the room, as the host running it, left to right in the order it's used: config, then
 * joining and simulated participants, with a card for everyone in the room below them, then the
 * emcee's pane on a phone, on the right and in view once the screen is wide enough for two columns.
 */
export function Demo({ room }: { room: string }) {
  return (
    <RoomProvider role="host" room={room}>
      <HostView room={room} />
    </RoomProvider>
  );
}
