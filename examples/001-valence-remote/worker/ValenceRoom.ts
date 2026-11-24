import { Agent } from 'agents';
import type { Connection, ConnectionContext, WSMessage } from 'agents';
import { isRole, parsePhoneValence } from '../src/room/protocol.ts';
import type { Role, RoomMessage } from '../src/room/protocol.ts';

/**
 * One room of phones and viewers. Phones send their valence; the room passes it on to every viewer,
 * stamped with the phone's connection id and the time it arrived, and tells viewers who joins and leaves.
 */
export class ValenceRoom extends Agent {
  getConnectionTags(_connection: Connection, ctx: ConnectionContext): Array<string> {
    const role = new URL(ctx.request.url).searchParams.get('role');
    return [isRole(role) ? role : 'viewer'];
  }

  shouldSendProtocolMessages(): boolean {
    return false;
  }

  onConnect(connection: Connection): void {
    this.toViewers({ id: connection.id, role: roleOf(connection), type: 'joined' });
  }

  onClose(connection: Connection): void {
    this.toViewers({ id: connection.id, type: 'left' });
  }

  onMessage(connection: Connection, message: WSMessage): void {
    if (typeof message !== 'string' || roleOf(connection) !== 'phone') {
      return;
    }
    const msg = parsePhoneValence(message);
    if (msg) {
      this.toViewers({ id: connection.id, t: Date.now(), type: 'valence', v: msg.v });
    }
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
