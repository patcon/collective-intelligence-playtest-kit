import { Empty, Meter, Table } from '@cloudflare/kumo';
import { DeviceMobileIcon } from '@phosphor-icons/react';
import { formatValence } from '../../ValenceRemote/lib/valenceColor.ts';
import { formatAge, rateOf } from '../lib/phones.ts';
import type { PhoneRow } from '../lib/phones.ts';

interface PhoneTableProps {
  phones: Array<PhoneRow>;
  now: number;
}

/** One row per connected phone: its current valence, how often it's sending, and when it last did. */
export function PhoneTable({ phones, now }: PhoneTableProps) {
  if (phones.length === 0) {
    return (
      <Empty
        description="Scan the QR code, or open /remote?detection=touch in another tab."
        icon={<DeviceMobileIcon size={32} />}
        title="No phones yet"
      />
    );
  }

  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.Head className="w-2/3">Phone and valence</Table.Head>
          <Table.Head>Msg/s</Table.Head>
          <Table.Head>Last</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {phones.map((row) => (
          <Table.Row key={row.id}>
            <Table.Cell title={row.id}>
              <Meter
                customValue={formatValence(row.v)}
                label={row.id.slice(0, 8)}
                max={1}
                min={-1}
                showValue
                value={row.v ?? 0}
              />
            </Table.Cell>
            <Table.Cell className="tabular-nums">{rateOf(row, now)}</Table.Cell>
            <Table.Cell className="whitespace-nowrap tabular-nums">{formatAge(row, now)}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
