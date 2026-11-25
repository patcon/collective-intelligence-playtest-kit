import { Badge } from '@cloudflare/kumo';
import type { RoomStatus } from '@playtest-kit/common';
import { useRoomStatus } from './client.ts';

const STATUS_BADGE: Record<RoomStatus, { label: string; variant: 'success' | 'warning' | 'error' }> = {
  closed: { label: 'reconnecting', variant: 'error' },
  connecting: { label: 'connecting', variant: 'warning' },
  open: { label: 'connected', variant: 'success' },
};

/** Whether this device's socket to the room is open. */
export function RoomStatusBadge() {
  const { label, variant } = STATUS_BADGE[useRoomStatus()];
  return <Badge variant={variant}>{label}</Badge>;
}
