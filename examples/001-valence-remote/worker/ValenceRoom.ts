import { Agent } from 'agents';
import type { Connection, ConnectionContext, WSMessage } from 'agents';
import { isRole, parsePhoneMessage, parseViewerMessage } from '../src/room/protocol.ts';
import type { Role, RoomMessage, SettingsMessage } from '../src/room/protocol.ts';
import type { RemoteSettings } from '../src/room/remoteSettings.ts';

interface RoomState {
  /** What a viewer last pushed for every phone to run with, or null to let each use its own. */
  settings: RemoteSettings | null;
}

/** The room reads no bindings from its env. */
type RoomEnv = object;

/**
 * One room of phones and viewers. Phones send their valence and activity; the room passes them on to every viewer,
 * stamped with the phone's connection id and the time it arrived, and tells viewers who joins and leaves.
 * A viewer can push settings for every phone to run with; the room keeps them (in its state, so they
 * outlast hibernation), passes them on to everyone, and sends them to each connection as it joins.
 */
export class ValenceRoom extends Agent<RoomEnv, RoomState> {
  initialState: RoomState = { settings: null };

  getConnectionTags(_connection: Connection, ctx: ConnectionContext): Array<string> {
    const role = new URL(ctx.request.url).searchParams.get('role');
    return [isRole(role) ? role : 'viewer'];
  }

  /** Also keeps `setState` from broadcasting the state: the room sends its settings itself, as a `settings` message. */
  shouldSendProtocolMessages(): boolean {
    return false;
  }

  onConnect(connection: Connection): void {
    this.toViewers({ id: connection.id, role: roleOf(connection), type: 'joined' });
    connection.send(JSON.stringify(this.settingsMessage()));
  }

  onClose(connection: Connection): void {
    this.toViewers({ id: connection.id, type: 'left' });
  }

  onMessage(connection: Connection, message: WSMessage): void {
    if (typeof message !== 'string') {
      return;
    }
    if (roleOf(connection) === 'phone') {
      this.onPhoneMessage(connection, message);
    } else {
      this.onViewerMessage(message);
    }
  }

  private onPhoneMessage(connection: Connection, message: string): void {
    const msg = parsePhoneMessage(message);
    if (msg?.type === 'valence') {
      this.toViewers({ id: connection.id, t: Date.now(), type: 'valence', v: msg.v });
    } else if (msg?.type === 'activity') {
      this.toViewers({ activity: msg.activity, id: connection.id, type: 'activity' });
    }
  }

  private onViewerMessage(message: string): void {
    const msg = parseViewerMessage(message);
    if (msg) {
      this.setState({ settings: msg.settings });
      this.broadcast(JSON.stringify(this.settingsMessage()));
    }
  }

  private settingsMessage(): SettingsMessage {
    return { settings: this.state.settings, type: 'settings' };
  }

  private toViewers(msg: RoomMessage): void {
    const text = JSON.stringify(msg);
    for (const viewer of this.getConnections('viewer')) {
      viewer.send(text);
    }
  }
}

function roleOf(connection: Connection): Role {
  return connection.tags.includes('phone') ? 'phone' : 'viewer';
}
