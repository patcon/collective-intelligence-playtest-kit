import { Loader, Surface } from '@cloudflare/kumo';
import { RoomStatusBadge } from '@playtest-kit/ui';
import { useState } from 'react';
import { HoverStore } from '../demo/HoverStore.ts';
import { InfoArea } from '../demo/InfoArea.tsx';
import { JoinPanel } from '../demo/JoinPanel.tsx';
import { COLUMN_ORDERS, orderColumns } from '../demo/columnOrder.ts';
import type { ColumnOrder } from '../demo/columnOrder.ts';
import { CycleButton } from '../demo/CycleButton.tsx';
import { MATRIX_VARIANTS } from '../demo/matrixLayout.ts';
import { REVERSED_VIEWS } from '../demo/reversedItems.ts';
import type { ReversedView } from '../demo/reversedItems.ts';
import type { MatrixVariant } from '../demo/matrixLayout.ts';
import { MatrixLegend } from '../demo/MatrixLegend.tsx';
import { matrixRows } from '../demo/matrixRows.ts';
import { QuizControls } from '../demo/QuizControls.tsx';
import { VoteMatrix } from '../demo/VoteMatrix.tsx';
import { hostRoom } from '../room/client.ts';
import { ROOM } from '../room/protocol.ts';
import { useRoomSnapshot } from '../room/useRoomSnapshot.ts';
import { SimControls } from '../simulation/SimControls.tsx';
import { useSimulation } from '../simulation/useSimulation.ts';

const { RoomProvider, useRoomSend, useRoomStatus } = hostRoom;

function HostView() {
  const status = useRoomStatus();
  const send = useRoomSend();
  const snapshot = useRoomSnapshot();
  const simulation = useSimulation();
  const [hover] = useState(() => new HoverStore());
  const [variant, setVariant] = useState<MatrixVariant>('cells');
  const [columnOrder, setColumnOrder] = useState<ColumnOrder>('seen');
  const [reversed, setReversed] = useState<ReversedView>('answered');
  const rows = snapshot ? matrixRows(snapshot, new Map(simulation.sims.map((sim) => [sim.id, sim.name]))) : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-400 flex-col gap-4 p-4">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Quizzes</h1>
          <RoomStatusBadge status={status} />
        </div>
        <p className="max-w-2xl text-sm text-kumo-subtle">
          A room takes a personality quiz together (the IPIP Big-Five Factor Markers), and everyone’s answers fill in live.
        </p>
      </header>
      {snapshot && rows ? (
        <>
          <div className="grid items-start gap-4 lg:grid-cols-3">
            <SimControls simulation={simulation} />
            <QuizControls
              onConfig={(config) => send({ config, type: 'config' })}
              onReset={() => send({ type: 'reset' })}
              onStart={() => send({ type: 'start' })}
              snapshot={snapshot}
            />
            <JoinPanel />
          </div>
          <InfoArea
            hover={hover}
            people={new Map(simulation.sims.map((sim) => [sim.id, sim.person]))}
            rows={rows}
            statements={snapshot.statements}
          />
          <Surface className="flex flex-col gap-3 rounded-lg p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">Answers</h2>
                <CycleButton label="View" onChange={setVariant} options={MATRIX_VARIANTS} value={variant} />
                <CycleButton label="Columns" onChange={setColumnOrder} options={COLUMN_ORDERS} value={columnOrder} />
                <CycleButton label="Reversed" onChange={setReversed} options={REVERSED_VIEWS} value={reversed} />
              </div>
              <MatrixLegend />
            </div>
            <VoteMatrix columns={orderColumns(snapshot.statements, columnOrder)} hover={hover} reversed={reversed} rows={rows} variant={variant} />
          </Surface>
        </>
      ) : (
        <Loader />
      )}
    </main>
  );
}

/** `/demo`: the room, as the host running it. */
export function Demo() {
  return (
    <RoomProvider role="host" room={ROOM}>
      <HostView />
    </RoomProvider>
  );
}
