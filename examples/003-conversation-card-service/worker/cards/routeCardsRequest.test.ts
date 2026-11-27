import { describe, expect, it } from 'vitest';
import { routeCardsRequest } from './routeCardsRequest.ts';
import type { Card, CardsResponse, Deck } from './types.ts';

const deck: Deck = [
  { id: '1', text: 'What am I secretly not telling myself?', type: 'ear' },
  { id: '2', text: 'What would be the strategic approach to it?', type: 'gem' },
  { id: '3', text: 'What am I doing daily to become who I want to be?', type: 'gem' },
  { id: '4', text: 'What complementary skills do I need?', type: 'gem' },
  { id: '5', text: 'Who do I want at my funeral?', type: 'infinity' },
];

const get = (path: string) => new Request(`https://example.test${path}`);

async function json<T>(path: string, options?: Parameters<typeof routeCardsRequest>[2]): Promise<{ status: number; body: T }> {
  const response = await routeCardsRequest(get(path), deck, options);
  if (!response) {
    throw new Error(`${path} wasn't handled`);
  }
  return { status: response.status, body: (await response.json()) as T };
}

const idsOf = (cards: ReadonlyArray<Card>) => cards.map((card) => card.id);

describe('GET /api/cards', () => {
  it('lists every card in deck order, with the pool and deck size', async () => {
    const { status, body } = await json<CardsResponse>('/api/cards');
    expect(status).toBe(200);
    expect(idsOf(body.cards)).toEqual(['1', '2', '3', '4', '5']);
    expect(body.meta).toEqual({ pool: 5, total: 5 });
  });

  it.each([
    ['a card type', '?type=gem', ['2', '3', '4']],
    ['a short list of ids', '?ids=5,1', ['1', '5']],
    ['a card type and ids together', '?type=gem&ids=1,2,3', ['2', '3']],
    ['excluded ids, after the other filters', '?type=gem&exclude=3', ['2', '4']],
    ['ids it ignores when unknown', '?ids=2,99&exclude=98', ['2']],
    ['an unknown card type, to an empty pool', '?type=nope', []],
    ['nothing, when the filters are present but empty', '?type=&ids=,&exclude=', ['1', '2', '3', '4', '5']],
  ])('narrows the pool by %s', async (_, query, expected) => {
    const { status, body } = await json<CardsResponse>(`/api/cards${query}`);
    expect(status).toBe(200);
    expect(idsOf(body.cards)).toEqual(expected);
    expect(body.meta).toEqual({ pool: expected.length, total: 5 });
  });
});

/** Replays `values` in order, standing in for `Math.random`. */
const replay = (...values: Array<number>) => {
  let next = 0;
  return () => values[next++ % values.length] ?? 0;
};

describe('GET /api/cards/random', () => {
  it('draws one card by default, reporting the whole pool', async () => {
    const { status, body } = await json<CardsResponse>('/api/cards/random?type=gem', { rng: replay(0.5) });
    expect(status).toBe(200);
    expect(body.cards).toHaveLength(1);
    expect(['2', '3', '4']).toContain(body.cards[0]?.id);
    expect(body.meta).toEqual({ pool: 3, total: 5 });
  });

  it('draws several cards with no repeats', async () => {
    const { body } = await json<CardsResponse>('/api/cards/random?limit=4', { rng: replay(0.9, 0.1, 0.5) });
    expect(new Set(idsOf(body.cards)).size).toBe(4);
    expect(body.meta.pool).toBe(5);
  });

  it('gives the same draw for the same random numbers', async () => {
    const first = await json<CardsResponse>('/api/cards/random?limit=3', { rng: replay(0.7, 0.2) });
    const second = await json<CardsResponse>('/api/cards/random?limit=3', { rng: replay(0.7, 0.2) });
    expect(idsOf(second.body.cards)).toEqual(idsOf(first.body.cards));
  });

  it('gives different draws for different random numbers', async () => {
    const low = await json<CardsResponse>('/api/cards/random', { rng: replay(0) });
    const high = await json<CardsResponse>('/api/cards/random', { rng: replay(0.99) });
    expect(low.body.cards[0]?.id).not.toBe(high.body.cards[0]?.id);
  });

  it('returns the whole pool when the limit is larger', async () => {
    const { body } = await json<CardsResponse>('/api/cards/random?type=gem&limit=10');
    expect(idsOf(body.cards).toSorted()).toEqual(['2', '3', '4']);
    expect(body.meta).toEqual({ pool: 3, total: 5 });
  });

  it('never draws an excluded card', async () => {
    const { body } = await json<CardsResponse>('/api/cards/random?type=gem&exclude=2,4&limit=3');
    expect(idsOf(body.cards)).toEqual(['3']);
    expect(body.meta).toEqual({ pool: 1, total: 5 });
  });

  it('answers an empty pool with no cards', async () => {
    const { status, body } = await json<CardsResponse>('/api/cards/random?ids=99');
    expect(status).toBe(200);
    expect(body).toEqual({ cards: [], meta: { pool: 0, total: 5 } });
  });

  it.each(['0', '-1', '1.5', 'two', ''])('rejects limit=%j', async (limit) => {
    const { status, body } = await json<{ error: string }>(`/api/cards/random?limit=${limit}`);
    expect(status).toBe(400);
    expect(body.error).toMatch(/limit/);
  });
});

describe('GET /api/cards/:cardId', () => {
  it('answers with the one card', async () => {
    const { status, body } = await json<{ card: Card }>('/api/cards/5');
    expect(status).toBe(200);
    expect(body).toEqual({ card: { id: '5', text: 'Who do I want at my funeral?', type: 'infinity' } });
  });

  it.each(['99', '%E0%A4%A'])('answers 404 for the unknown id %s', async (id) => {
    const { status, body } = await json<{ error: string }>(`/api/cards/${id}`);
    expect(status).toBe(404);
    expect(body).toEqual({ error: 'not found' });
  });
});

describe('routing', () => {
  it.each(['/', '/api', '/api/count', '/api/cardsets', '/api/cards/5/extra'])('leaves %s to the host app', async (path) => {
    expect(await routeCardsRequest(get(path), deck)).toBeNull();
  });

  it('answers under a custom prefix instead of the default', async () => {
    const { body } = await json<{ card: Card }>('/prompts/2', { prefix: '/prompts' });
    expect(body.card.id).toBe('2');
    expect(await routeCardsRequest(get('/api/cards'), deck, { prefix: '/prompts' })).toBeNull();
  });

  it('answers 405 to anything but GET', async () => {
    const response = await routeCardsRequest(new Request('https://example.test/api/cards', { method: 'POST' }), deck);
    expect(response?.status).toBe(405);
    expect(response?.headers.get('Allow')).toBe('GET');
  });
});
