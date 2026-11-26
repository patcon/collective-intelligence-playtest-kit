import { describe, expect, it } from 'vitest';
import { roleFromUrl, roleOf, sendToRole } from './connections.ts';

type Role = 'host' | 'participant';
const isRole = (value: unknown): value is Role => value === 'host' || value === 'participant';

describe('roleFromUrl', () => {
  it('reads ?role=', () => {
    expect(roleFromUrl('https://x.test/agents/room/a?role=host', isRole, 'participant')).toBe('host');
  });

  it.each(['https://x.test/a', 'https://x.test/a?role=admin'])('falls back for %s', (url) => {
    expect(roleFromUrl(url, isRole, 'participant')).toBe('participant');
  });
});

describe('roleOf', () => {
  it('finds the role among the tags', () => {
    expect(roleOf({ tags: ['abc', 'host'] }, isRole, 'participant')).toBe('host');
  });

  it('falls back when no tag is a role', () => {
    expect(roleOf({ tags: ['abc'] }, isRole, 'participant')).toBe('participant');
  });
});

describe('sendToRole', () => {
  it('sends one JSON text to each connection with the tag', () => {
    const sent: Array<string> = [];
    const connection = { send: (text: string) => sent.push(text) };
    const room = { getConnections: (tag: string) => (tag === 'host' ? [connection, connection] : []) };
    sendToRole(room, 'host', { type: 'ping' });
    sendToRole(room, 'participant', { type: 'ignored' });
    expect(sent).toEqual(['{"type":"ping"}', '{"type":"ping"}']);
  });
});
