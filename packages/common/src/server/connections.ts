/** A role check, such as a protocol's `isRole`. */
export type RoleGuard<Role extends string> = (value: unknown) => value is Role;

/** What these helpers need of a connection: the tags it was given as it connected. */
export interface TaggedConnection {
  readonly tags: ReadonlyArray<string>;
}

/** What these helpers need of a room: its connections, by tag. */
export interface ConnectionsByTag {
  getConnections(tag: string): Iterable<{ send(text: string): void }>;
}

/** The role a client asked for with `?role=` on its socket URL, or `fallback` when it isn't one. */
export function roleFromUrl<Role extends string>(url: string, isRole: RoleGuard<Role>, fallback: Role): Role {
  const role = new URL(url).searchParams.get('role');
  return isRole(role) ? role : fallback;
}

/** The role a connection was tagged with as it connected (see `roleFromUrl`), or `fallback`. */
export function roleOf<Role extends string>(connection: TaggedConnection, isRole: RoleGuard<Role>, fallback: Role): Role {
  return connection.tags.find(isRole) ?? fallback;
}

/** Sends `msg`, as JSON, to every connection tagged `role`. */
export function sendToRole(room: ConnectionsByTag, role: string, msg: unknown): void {
  const text = JSON.stringify(msg);
  for (const connection of room.getConnections(role)) {
    connection.send(text);
  }
}
