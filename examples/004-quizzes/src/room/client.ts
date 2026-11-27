import { createRoomClient } from '@playtest-kit/common';
import { AGENT, parseToHost, parseToParticipant } from './protocol.ts';
import type { HostMessage, ParticipantMessage, ToHost, ToParticipant } from './protocol.ts';

/** The provider and hooks for a `QuizRoom`, as a participant: hears its own view, sends ready, answers and undo. */
export const participantRoom = createRoomClient<ToParticipant, ParticipantMessage>({ agent: AGENT, parse: parseToParticipant });

/** The provider and hooks for a `QuizRoom`, as the host: hears snapshots, sends config, Start and Reset. */
export const hostRoom = createRoomClient<ToHost, HostMessage>({ agent: AGENT, parse: parseToHost });
