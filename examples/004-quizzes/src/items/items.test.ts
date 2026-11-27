import { describe, expect, it } from 'vitest';
import { isItemId, itemById, ITEMS, TRAIT_NAMES, TRAITS } from './items.ts';
import type { ItemId, Trait } from './items.ts';

describe('items', () => {
  it('has the 50 statements, 10 per trait, in the test’s order', () => {
    expect(ITEMS).toHaveLength(50);
    for (const trait of TRAITS) {
      expect(ITEMS.filter((item) => item.trait === trait)).toHaveLength(10);
    }
    expect(ITEMS.map((item) => item.order)).toEqual(ITEMS.map((_, i) => i + 1));
  });

  it('looks statements up by id, and knows which ids are real', () => {
    expect(itemById('EXT1').text).toBe('I am the life of the party.');
    expect(itemById('AGR1').keyed).toBe(-1);
    expect(isItemId('OPN10')).toBe(true);
    expect(isItemId('OPN11')).toBe(false);
    expect(isItemId('ext1')).toBe(false);
    expect(TRAIT_NAMES.EST).toBe('Emotional stability');
  });

  it('types out ids and traits that aren’t in the file', () => {
    // @ts-expect-error: there are only ten statements per trait
    const badId: ItemId = 'EXT11';
    // @ts-expect-error: not one of the five traits
    const badTrait: Trait = 'NEU';
    expect([badId, badTrait]).toHaveLength(2);
  });
});
