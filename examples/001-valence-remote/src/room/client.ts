import { createRoomClient } from '@playtest-kit/common';
import { parseRoomMessage } from './protocol.ts';
import type { RoomMessage } from './protocol.ts';

/** The provider and hooks for a `ValenceRoom`, as a phone or a viewer. */
export const { RoomProvider, useRoomMessages, useRoomSend, useRoomStatus, useSendOnOpen } = createRoomClient<
  RoomMessage,
  RoomMessage
>({ agent: 'ValenceRoom', parse: parseRoomMessage });
