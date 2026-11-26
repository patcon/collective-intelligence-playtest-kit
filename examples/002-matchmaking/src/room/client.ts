import { createRoomClient } from '@playtest-kit/common';
import { AGENT, parseToHost, parseToParticipant } from './protocol.ts';
import type { HostMessage, ParticipantMessage, ToHost, ToParticipant } from './protocol.ts';

/** The provider and hooks for a `MatchRoom`, as a participant: hears its own view, sends ready and found. */
export const participantRoom = createRoomClient<ToParticipant, ParticipantMessage>({
  agent: AGENT,
  parse: parseToParticipant,
});

/** The provider and hooks for a `MatchRoom`, as the host: hears snapshots, sends config and round controls. */
export const hostRoom = createRoomClient<ToHost, HostMessage>({ agent: AGENT, parse: parseToHost });
