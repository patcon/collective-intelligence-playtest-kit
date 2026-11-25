import { Surface } from '@cloudflare/kumo';
import { useState } from 'react';
import { useInterval } from '@playtest-kit/common';
import { useRoomMessages } from '../hooks/effects/useRoomMessages.ts';
import { RoomStatusBadge } from '../room/RoomStatusBadge.tsx';
import { CopyButton } from './components/CopyButton.tsx';
import { JoinQrCode } from './components/JoinQrCode.tsx';
import { RemoteOptions, remoteUrl } from './components/RemoteOptions.tsx';
import { MessageLog } from './components/MessageLog.tsx';
import { PhoneTable } from './components/PhoneTable.tsx';
import { useRemoteSettings } from './hooks/useRemoteSettings.ts';
import { applyMessage } from './lib/phones.ts';
import type { Phones } from './lib/phones.ts';

const LOG_LENGTH = 50;
const CLOCK_MS = 250;

/** What phones in the room are sending: a row per phone, the raw message log, and a QR code to join. */
export function ViewerDashboard({ room }: { room: string }) {
  const [phones, setPhones] = useState<Phones>({});
  const [log, setLog] = useState<Array<string>>([]);
  const [now, setNow] = useState(() => Date.now());
  const remote = useRemoteSettings();

  useInterval(() => setNow(Date.now()), CLOCK_MS);

  useRoomMessages((msg) => {
    const at = Date.now();
    setPhones((current) => applyMessage(current, msg, at));
    setLog((current) => [JSON.stringify(msg), ...current].slice(0, LOG_LENGTH));
  });

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-4">
      <header className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Valence remote</h1>
        <span className="text-kumo-subtle">room “{room}”</span>
        <RoomStatusBadge />
      </header>
      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <Surface className="rounded-lg p-4">
          <PhoneTable now={now} phones={Object.values(phones)} />
        </Surface>
        <Surface className="rounded-lg p-4">
          <JoinQrCode url={remoteUrl(window.location.origin, remote.settings)}>
            <RemoteOptions {...remote} />
          </JoinQrCode>
        </Surface>
      </div>
      <Surface className="flex flex-col gap-2 rounded-lg p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Last {LOG_LENGTH} messages</h2>
          <CopyButton label="Copy" text={log.join('\n')} />
        </div>
        <MessageLog entries={log} />
      </Surface>
    </main>
  );
}
