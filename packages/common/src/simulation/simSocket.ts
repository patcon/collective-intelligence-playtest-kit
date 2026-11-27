/** What a simulated participant needs of its socket: to send text and to close. */
export interface SimSocket {
  send: (text: string) => void;
  close: () => void;
}

/** Opens a participant socket as `id`, calling back on each open (reconnects too) and each message. */
export type ConnectSim = (id: string, handlers: { onOpen: () => void; onMessage: (raw: string) => void }) => SimSocket;
