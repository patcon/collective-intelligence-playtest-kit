import { roleFromUrl, roleOf, sendToRole } from '@playtest-kit/common/server';
import { Agent } from 'agents';
import type { Connection, ConnectionContext, WSMessage } from 'agents';
import { assignCues } from '../src/cues/cueTypes.ts';
import { INITIAL_ROOM_STATE, reduce } from '../src/room/matchRoom.ts';
import type { RoomEvent, RoomState } from '../src/room/matchRoom.ts';
import { isRole, parseHostMessage, parseParticipantMessage } from '../src/room/protocol.ts';
import type { Role, ToHost, ToParticipant } from '../src/room/protocol.ts';
import { snapshotOf, viewFor } from '../src/room/roomSelectors.ts';

/** The room reads no bindings from its env. */
type RoomEnv = object;

const DEPS = { assignCues, rng: Math.random };

/**
 * One matchmaking room. All its logic is the pure `reduce` in `src/room/matchRoom.ts`; this class
 * turns socket events into reducer events, keeps the result with `setState` (so it outlasts
 * hibernation), and after every change sends each participant their own view and the host a full
 * snapshot. Late joiners and reconnects get the same messages as everyone else, so there's no catch-up.
 */
export class MatchRoom extends Agent<RoomEnv, RoomState> {
  initialState: RoomState = INITIAL_ROOM_STATE;

  getConnectionTags(_connection: Connection, ctx: ConnectionContext): Array<string> {
    return [roleFromUrl(ctx.request.url, isRole, 'participant')];
  }

  /** Also keeps `setState` from broadcasting the state: the room sends views and snapshots itself. */
  shouldSendProtocolMessages(): boolean {
    return false;
  }

  /**
   * After hibernation the sockets are still here, but after a restart they're gone without a close:
   * anyone the state still thinks is connected, and isn't, has left.
   */
  onStart(): void {
    const live = new Set(this.participantIds());
    for (const p of this.state.participants) {
      if (p.connected && !live.has(p.id)) {
        this.apply({ id: p.id, type: 'leave' });
      }
    }
  }

  onConnect(connection: Connection): void {
    if (roleOfConnection(connection) === 'participant') {
      this.apply({ id: connection.id, type: 'join' });
    }
    this.sendTo(connection);
  }

  /** A reload can open the new socket before the old one closes; only the last to go counts as leaving. */
  onClose(connection: Connection): void {
    if (roleOfConnection(connection) === 'participant' && !this.participantIds().includes(connection.id)) {
      this.apply({ id: connection.id, type: 'leave' });
    }
  }

  onMessage(connection: Connection, message: WSMessage): void {
    if (typeof message !== 'string') {
      return;
    }
    if (roleOfConnection(connection) === 'participant') {
      const msg = parseParticipantMessage(message);
      if (msg) {
        this.apply({ ...msg, id: connection.id });
      }
    } else {
      const msg = parseHostMessage(message);
      if (msg) {
        this.apply(msg);
      }
    }
  }

  private apply(event: RoomEvent): void {
    const next = reduce(this.state, event, DEPS);
    if (next !== this.state) {
      this.setState(next);
      this.publish();
    }
  }

  private publish(): void {
    const toHost: ToHost = { snapshot: snapshotOf(this.state), type: 'snapshot' };
    sendToRole(this, 'host', toHost);
    for (const connection of this.getConnections('participant')) {
      this.sendTo(connection);
    }
  }

  private sendTo(connection: Connection): void {
    const msg: ToParticipant | ToHost =
      roleOfConnection(connection) === 'participant'
        ? { nextCue: this.state.config.cue, type: 'view', view: viewFor(this.state, connection.id) }
        : { snapshot: snapshotOf(this.state), type: 'snapshot' };
    connection.send(JSON.stringify(msg));
  }

  /** The ids of participant sockets that are open now. */
  private participantIds(): Array<string> {
    return [...this.getConnections('participant')].flatMap((c) => (c.readyState === WebSocket.OPEN ? [c.id] : []));
  }
}

function roleOfConnection(connection: Connection): Role {
  return roleOf(connection, isRole, 'participant');
}
