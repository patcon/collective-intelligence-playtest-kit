import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessionId } from './sessionId.ts';

function fakeStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value),
  };
}

describe('sessionId', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps one id per key in sessionStorage', () => {
    const storage = fakeStorage();
    vi.stubGlobal('sessionStorage', storage);
    const id = sessionId('participant');
    expect(sessionId('participant')).toBe(id);
    expect(storage.getItem('participant')).toBe(id);
    expect(sessionId('other')).not.toBe(id);
  });

  it('falls back to an id that lasts as long as the page when storage throws', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
    });
    const id = sessionId('blocked');
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(sessionId('blocked')).toBe(id);
  });
});
