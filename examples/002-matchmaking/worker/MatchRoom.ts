import { roleFromUrl, roleOf, sendToRole } from '@playtest-kit/common/server';
import { Agent } from 'agents';
import type { Connection, ConnectionContext, WSMessage } from 'agents';
import { assignCues } from '../src/cues/cueTypes.ts';
import { DEFAULT_CONFIG, isMatchConfig } from '../src/room/matchConfig.ts';
import { INITIAL_ROOM_STATE, reduce } from '../src/room/matchRoom.ts';
import type { RoomEvent, RoomState } from '../src/room/matchRoom.ts';
import { isRole, parseHostMessage, parseParticipantMessage } from '../src/room/protocol.ts';
import type { Role, ToHost, ToParticipant } from '../src/room/protocol.ts';
import { snapshotOf, viewFor } from '../src/room/roomSelectors.ts';

/** The room reads no bindings from its env. */
type RoomEnv = object;

const DEPS = { assignCues, rng: Math.random };

/** The close code a removed participant's socket gets (4000–4999 is for applications). */
const REMOVED_CODE = 4001;

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
   * anyone the state still thinks is connected, and isn't, has left. A config kept by an older build
   * that this one can't read (a field added since, a cue type renamed) goes back to the defaults.
   */
  onStart(): void {
    void this.sql`CREATE TABLE IF NOT EXISTS removed_participants (id TEXT PRIMARY KEY)`;
    if (!isMatchConfig(this.state.config)) {
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
    if (roleOfConnection(connection) === 'participant' && this.isRemoved(connection.id)) {
      connection.close(REMOVED_CODE, 'Removed from the room');
      return;
    }
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
      if (msg?.type === 'remove') {
        this.remove(msg.ids);
      } else if (msg) {
        this.apply(msg);
      }
    }
  }

  /**
   * Disconnects these participants and turns them away if they try again (a stray sim's socket
   * reconnects by itself). Kept in storage, so it holds after the room hibernates or restarts.
   */
  private remove(ids: ReadonlyArray<string>): void {
    for (const id of ids) {
      void this.sql`INSERT OR IGNORE INTO removed_participants (id) VALUES (${id})`;
      for (const connection of this.getConnections('participant')) {
        if (connection.id === id) {
          connection.close(REMOVED_CODE, 'Removed from the room');
        }
      }
      this.apply({ id, type: 'leave' });
    }
  }

  private isRemoved(id: string): boolean {
    return this.sql<{ id: string }>`SELECT id FROM removed_participants WHERE id = ${id}`.length > 0;
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
        ? { nextCue: this.state.config.cue, showFoundCount: this.state.config.showFoundCount, type: 'view', view: viewFor(this.state, connection.id) }
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
