import { roleFromUrl, roleOf, sendToRole } from '@playtest-kit/common/server';
import { Agent } from 'agents';
import type { Connection, ConnectionContext, WSMessage } from 'agents';
import { isRole, parsePhoneMessage, parseViewerMessage } from '../src/room/protocol.ts';
import type { Role, RoomMessage, SettingsMessage } from '../src/room/protocol.ts';
import { catchUpOn, phoneStateOf, withPhoneMessage } from '../src/room/phoneState.ts';
import type { RemoteSettings } from '../src/room/remoteSettings.ts';

interface RoomState {
  /** What a viewer last set for every phone to run with, or null until one does. */
  settings: RemoteSettings | null;
}

/** The room reads no bindings from its env. */
type RoomEnv = object;

/**
 * One room of phones and viewers. Phones send their valence and activity; the room passes them on to every viewer,
 * stamped with the phone's connection id and the time it arrived, and tells viewers who joins and leaves.
 * Each phone's last valence and activity are kept on its connection (see `PhoneState`), so a viewer
 * that joins later hears every phone already here, as it is now.
 * Viewers set the settings every phone runs with; the room keeps them (in its state, so they
 * outlast hibernation), passes them on to everyone, and sends them to each connection as it joins.
 */
export class ValenceRoom extends Agent<RoomEnv, RoomState> {
  initialState: RoomState = { settings: null };

  getConnectionTags(_connection: Connection, ctx: ConnectionContext): Array<string> {
    return [roleFromUrl(ctx.request.url, isRole, 'viewer')];
  }

  /** Also keeps `setState` from broadcasting the state: the room sends its settings itself, as a `settings` message. */
  shouldSendProtocolMessages(): boolean {
    return false;
  }

  onConnect(connection: Connection): void {
    this.toViewers({ id: connection.id, role: roleOfConnection(connection), type: 'joined' });
    connection.send(JSON.stringify(this.settingsMessage()));
    if (roleOfConnection(connection) === 'viewer') {
      this.catchUp(connection);
    }
  }

  onClose(connection: Connection): void {
    this.toViewers({ id: connection.id, type: 'left' });
  }

  onMessage(connection: Connection, message: WSMessage): void {
    if (typeof message !== 'string') {
      return;
    }
    if (roleOfConnection(connection) === 'phone') {
      this.onPhoneMessage(connection, message);
    } else {
      this.onViewerMessage(message);
    }
  }

  private onPhoneMessage(connection: Connection, message: string): void {
    const msg = parsePhoneMessage(message);
    if (!msg) {
      return;
    }
    const now = Date.now();
    connection.setState(withPhoneMessage(phoneStateOf(connection.state), msg, now));
    if (msg.type === 'valence') {
      this.toViewers({ id: connection.id, t: now, type: 'valence', v: msg.v });
    } else {
      this.toViewers({ activity: msg.activity, id: connection.id, type: 'activity' });
    }
  }

  /** Tells a viewer that just joined about every phone already here, as each last said. */
  private catchUp(viewer: Connection): void {
    for (const phone of this.getConnections('phone')) {
      for (const msg of catchUpOn(phone.id, phoneStateOf(phone.state))) {
        viewer.send(JSON.stringify(msg));
      }
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
    sendToRole(this, 'viewer', msg);
  }
}

function roleOfConnection(connection: Connection): Role {
  return roleOf(connection, isRole, 'viewer');
}
