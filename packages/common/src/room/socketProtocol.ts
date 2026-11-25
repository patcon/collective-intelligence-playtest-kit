/**
 * The socket's scheme, matching the page's. PartySocket otherwise picks `ws` for private-network
 * hosts (192.168.*, 10.*), which an HTTPS page on the LAN blocks as mixed content. Pass it as the
 * `protocol` of any socket to a room that isn't made by `createRoomClient`.
 */
export function socketProtocol(): 'ws' | 'wss' {
  return window.location.protocol === 'https:' ? 'wss' : 'ws';
}
