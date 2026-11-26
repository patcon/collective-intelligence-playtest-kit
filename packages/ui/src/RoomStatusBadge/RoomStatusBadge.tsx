import { Badge } from '@cloudflare/kumo';
import type { RoomStatus } from '@playtest-kit/common';

const STATUS_BADGE: Record<RoomStatus, { label: string; variant: 'success' | 'warning' | 'error' }> = {
  closed: { label: 'reconnecting', variant: 'error' },
  connecting: { label: 'connecting', variant: 'warning' },
  open: { label: 'connected', variant: 'success' },
};

/** Whether this device's socket to the room is open (see `useRoomStatus` from `createRoomClient`). */
export function RoomStatusBadge({ status }: { status: RoomStatus }) {
  const { label, variant } = STATUS_BADGE[status];
  return <Badge variant={variant}>{label}</Badge>;
}
