import { drawCards } from './drawCards.ts';
import { filterCards } from './filterCards.ts';
import { getCard } from './getCard.ts';
import { parseFilters, parseLimit } from './parseFilters.ts';
import type { CardsResponse, Deck, Random } from './types.ts';

export interface RouteCardsOptions {
  /** Where the routes are mounted. Defaults to `/api/cards`. */
  readonly prefix?: string;
  /** Source of randomness for draws. Defaults to `Math.random`. */
  readonly rng?: Random;
}

/**
 * Answers the card routes under `prefix` for `deck`, or resolves to `null` for any other path, so a
 * Worker can mount it with `(await routeCardsRequest(request, deck)) ?? …`:
 *
 * - `GET {prefix}?type=&ids=&exclude=`: every card in the pool, in deck order
 * - `GET {prefix}/random?type=&ids=&exclude=&limit=`: up to `limit` (default 1) cards drawn at random
 * - `GET {prefix}/:cardId`: one card, or 404
 */
export async function routeCardsRequest(
  request: Request,
  deck: Deck,
  { prefix = '/api/cards', rng = Math.random }: RouteCardsOptions = {},
): Promise<Response | null> {
  const url = new URL(request.url);
  const route = subPath(url.pathname, prefix);
  if (route === null) {
    return null;
  }
  if (request.method !== 'GET') {
    return Response.json({ error: 'method not allowed' }, { headers: { Allow: 'GET' }, status: 405 });
  }
  if (route === '') {
    const pool = filterCards(deck, parseFilters(url.searchParams));
    const body: CardsResponse = { cards: pool, meta: { pool: pool.length, total: deck.length } };
    return Response.json(body);
  }
  if (route === 'random') {
    return draw(deck, url.searchParams, rng);
  }
  const id = decodeId(route);
  const card = id === null ? undefined : getCard(deck, id);
  return card ? Response.json({ card }) : Response.json({ error: 'not found' }, { status: 404 });
}

/** The card id a path segment spells, or `null` if its percent-escapes are malformed (so no card can match). */
function decodeId(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

/** What follows `prefix` in `pathname` (`''` for the prefix itself), or `null` if it isn't one of the card routes. */
function subPath(pathname: string, prefix: string): string | null {
  if (pathname === prefix) {
    return '';
  }
  const rest = pathname.startsWith(`${prefix}/`) ? pathname.slice(prefix.length + 1) : null;
  return rest && !rest.includes('/') ? rest : null;
}

function draw(deck: Deck, params: URLSearchParams, rng: Random): Response {
  const limit = parseLimit(params);
  if (limit === null) {
    return Response.json({ error: 'limit must be a positive whole number' }, { status: 400 });
  }
  return Response.json(drawCards(deck, { ...parseFilters(params), limit }, rng));
}
