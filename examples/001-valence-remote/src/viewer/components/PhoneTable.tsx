import { Badge, Empty, Meter, Table } from '@cloudflare/kumo';
import { DeviceMobileIcon } from '@phosphor-icons/react';
import { formatValence, valenceColor } from '../../ValenceRemote/lib/valenceColor.ts';
import type { Activity } from '../../ValenceRemote/lib/activity.ts';
import { rateOf } from '../lib/phones.ts';
import type { PhoneRow } from '../lib/phones.ts';

const ACTIVITY_BADGE: Record<Activity, { label: string; variant: 'neutral' | 'success' | 'warning' }> = {
  active: { label: 'active', variant: 'success' },
  idle: { label: 'idle', variant: 'warning' },
  arrived: { label: 'arrived', variant: 'neutral' },
};

function ActivityBadge({ activity }: { activity: Activity | null }) {
  if (activity === null) {
    return <span className="text-kumo-subtle">—</span>;
  }
  const { label, variant } = ACTIVITY_BADGE[activity];
  return (
    <Badge appearance="dot" variant={variant}>
      {label}
    </Badge>
  );
}

interface PhoneTableProps {
  phones: Array<PhoneRow>;
  now: number;
}

/**
 * One row per connected phone: its current valence (its whole bar tinted the phone's screen colour,
 * grey when idle), what its holder is doing, and how often it's sending.
 */
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
          <Table.Head>Activity</Table.Head>
          <Table.Head>Msg/s</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {phones.map((row) => (
          <Table.Row key={row.id}>
            <Table.Cell title={row.id}>
              <Meter
                customValue={formatValence(row.v)}
                indicatorClassName="bg-none bg-(--valence-color)"
                label={row.id.slice(0, 8)}
                max={1}
                min={-1}
                showValue
                trackClassName="bg-[color-mix(in_srgb,var(--valence-color)_35%,transparent)]"
                style={{ '--valence-color': valenceColor(row.v, row.activity === 'idle') }}
                value={row.v ?? 0}
              />
            </Table.Cell>
            <Table.Cell>
              <ActivityBadge activity={row.activity} />
            </Table.Cell>
            <Table.Cell className="tabular-nums">{rateOf(row, now)}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
