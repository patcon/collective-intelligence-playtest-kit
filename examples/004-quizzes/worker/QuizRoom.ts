import { roleFromUrl, roleOf, sendToRole } from '@playtest-kit/common/server';
import { Agent } from 'agents';
import type { Connection, ConnectionContext, WSMessage } from 'agents';
import { HostThrottle } from '../src/room/hostThrottle.ts';
import { isRole, parseHostMessage, parseParticipantMessage } from '../src/room/protocol.ts';
import type { Role, ToHost, ToParticipant } from '../src/room/protocol.ts';
import { DEFAULT_CONFIG, isQuizConfig } from '../src/room/quizConfig.ts';
import { INITIAL_ROOM_STATE, reduce } from '../src/room/quizRoom.ts';
import type { RoomEvent, RoomState } from '../src/room/quizRoom.ts';
import { snapshotOf, viewFor } from '../src/room/roomSelectors.ts';

/** The room reads no bindings from its env. */
type RoomEnv = object;

/**
 * The quiz room. All its logic is the pure `reduce` in `src/room/quizRoom.ts`; this class turns socket
 * events into reducer events and keeps the result with `setState` (so it outlasts hibernation). After a
 * change, whoever it was about gets their own view at once (everyone, for Start, Reset and config), and the
 * host gets a snapshot through `HostThrottle`: at most every 250 ms, but at once for a phase change or the
 * host's own config change (so its controls don't lag behind it).
 */
export class QuizRoom extends Agent<RoomEnv, RoomState> {
  initialState: RoomState = INITIAL_ROOM_STATE;
  #host = new HostThrottle(() => this.sendHost());

  getConnectionTags(_connection: Connection, ctx: ConnectionContext): Array<string> {
    return [roleFromUrl(ctx.request.url, isRole, 'participant')];
  }

  /** Also keeps `setState` from broadcasting the state: the room sends views and snapshots itself. */
  shouldSendProtocolMessages(): boolean {
    return false;
  }

  /**
   * After hibernation the sockets are still here, but after a restart they're gone without a close:
   * anyone the state still thinks is connected, and isn't, has left. A config kept by an older build that
   * this one can't read goes back to the defaults.
   */
  onStart(): void {
    if (!isQuizConfig(this.state.config)) {
      this.setState({ ...this.state, config: DEFAULT_CONFIG });
    }
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
    const event = roleOfConnection(connection) === 'participant' ? participantEvent(connection.id, message) : parseHostMessage(message);
    if (event) {
      this.apply(event);
    }
  }

  private apply(event: RoomEvent): void {
    const before = this.state;
    const next = reduce(before, event, Math.random);
    if (next === before) {
      return;
    }
    this.setState(next);
    this.#host.changed(next.phase !== before.phase || event.type === 'config');
    if ('id' in event) {
      const connection = this.getConnection(event.id);
      if (connection) {
        this.sendTo(connection);
      }
    } else {
      for (const connection of this.getConnections('participant')) {
        this.sendTo(connection);
      }
    }
  }

  private sendHost(): void {
    const msg: ToHost = { snapshot: snapshotOf(this.state), type: 'snapshot' };
    sendToRole(this, 'host', msg);
  }

  private sendTo(connection: Connection): void {
    const msg: ToParticipant | ToHost =
      roleOfConnection(connection) === 'participant'
        ? { type: 'view', view: viewFor(this.state, connection.id) }
        : { snapshot: snapshotOf(this.state), type: 'snapshot' };
    connection.send(JSON.stringify(msg));
  }

  /** The ids of participant sockets that are open now. */
  private participantIds(): Array<string> {
    return [...this.getConnections('participant')].flatMap((c) => (c.readyState === WebSocket.OPEN ? [c.id] : []));
  }
}

function participantEvent(id: string, raw: string): RoomEvent | null {
  const msg = parseParticipantMessage(raw);
  return msg ? { ...msg, id } : null;
}

function roleOfConnection(connection: Connection): Role {
  return roleOf(connection, isRole, 'participant');
}
