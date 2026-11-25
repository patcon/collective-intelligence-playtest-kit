import { describe, expect, it } from 'vitest';
import { createSender, SEND_MS } from './sender.ts';

describe('createSender', () => {
  it('sends the first reading at once', () => {
    expect(createSender().update(0.5, 0)).toBe(0.5);
  });

  it('holds a change that comes too soon, then sends it on flush', () => {
    const sender = createSender();
    sender.update(0, 0);
    expect(sender.update(0.5, 10)).toBeUndefined();
    expect(sender.flush(SEND_MS)).toBe(0.5);
  });

  it('never repeats a value that holds', () => {
    const sender = createSender();
    sender.update(0.5, 0);
    expect(sender.update(0.5, SEND_MS * 2)).toBeUndefined();
    expect(sender.flush(SEND_MS * 100)).toBeUndefined();
  });

  it('treats a move to or from null as a change', () => {
    const sender = createSender();
    sender.update(0.5, 0);
    expect(sender.update(null, SEND_MS)).toBeNull();
    expect(sender.update(0.5, SEND_MS * 2)).toBe(0.5);
  });

  it('sends nothing on flush before any reading', () => {
    expect(createSender().flush(SEND_MS * 5)).toBeUndefined();
  });
});
