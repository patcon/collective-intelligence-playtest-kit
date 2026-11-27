import { describe, expect, it } from 'vitest';
import { itemById, ITEMS, TRAITS } from '../items/items.ts';
import { chooseStatements } from './chooseStatements.ts';
import { seededRng } from './rng.ts';

const testOrder = (id: string) => ITEMS.findIndex((item) => item.id === id);

describe('chooseStatements', () => {
  it('for every N from 1 to 50: N distinct statements, even across traits, in the test’s order', () => {
    for (let n = 1; n <= 50; n++) {
      const chosen = chooseStatements(ITEMS, n, seededRng(n));
      expect(new Set(chosen).size).toBe(n);
      const perTrait = TRAITS.map((trait) => chosen.filter((id) => itemById(id).trait === trait).length);
      expect(Math.max(...perTrait) - Math.min(...perTrait)).toBeLessThanOrEqual(1);
      const order = chosen.map(testOrder);
      expect(order).toEqual(order.toSorted((a, b) => a - b));
    }
  });

  it('gives the same choice for the same seed', () => {
    expect(chooseStatements(ITEMS, 12, seededRng(7))).toEqual(chooseStatements(ITEMS, 12, seededRng(7)));
  });

  it('gives every statement, in order, for N = 50', () => {
    expect(chooseStatements(ITEMS, 50, seededRng(1))).toEqual(ITEMS.map((item) => item.id));
  });
});
