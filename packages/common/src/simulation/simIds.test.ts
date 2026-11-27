import { describe, expect, it } from 'vitest';
import { isSimId, newSimId } from './simIds.ts';

describe('sim ids', () => {
  it('marks new ids as sims, and nothing else', () => {
    expect(isSimId(newSimId())).toBe(true);
    expect(isSimId('phone-abc')).toBe(false);
  });

  it('makes a different id each time', () => {
    expect(newSimId()).not.toBe(newSimId());
  });
});
