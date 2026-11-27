import { describe, expect, it } from 'vitest';
import deck from '../../worker/data/the-and-deck.json' with { type: 'json' };

/** The chosen glyph for each card type, as the card component imports them. */
const glyphs = import.meta.glob('./icons/*.svg', { query: '?raw', import: 'default' });
const glyphTypes = new Set(Object.keys(glyphs).map((path) => path.replace(/^.*\/(.+)\.svg$/, '$1')));

describe('The And, Self edition deck', () => {
  it('has the 183 transcribed cards, without the placeholder rows', () => {
    expect(deck).toHaveLength(183);
  });

  it('gives every card a unique id', () => {
    expect(new Set(deck.map((card) => card.id)).size).toBe(deck.length);
  });

  it('gives every card text and a card type', () => {
    expect(deck.filter((card) => !card.text.trim() || !card.type)).toEqual([]);
  });

  it('has a chosen glyph for every card type', () => {
    const types = new Set(deck.map((card) => card.type));
    expect([...types].filter((type) => !glyphTypes.has(type))).toEqual([]);
  });
});
