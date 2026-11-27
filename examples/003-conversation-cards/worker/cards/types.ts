/** One conversation prompt from a deck. `type` is its card type, named after the icon printed on it. */
export interface Card {
  readonly id: string;
  readonly text: string;
  readonly type: string;
}

/** The full set of cards an app draws from. */
export type Deck = ReadonlyArray<Card>;

/** Narrows a deck to a pool: cards of `type`, and among `ids` when given, minus `exclude`. */
export interface CardFilters {
  readonly type?: string;
  readonly ids?: ReadonlyArray<string>;
  readonly exclude?: ReadonlyArray<string>;
}

/** What listing or drawing answers with. `pool` counts every card the filters allow, however few were returned. */
export interface CardsResponse {
  readonly cards: ReadonlyArray<Card>;
  readonly meta: { readonly pool: number; readonly total: number };
}

/** A random number in [0, 1), like `Math.random`. Injected so draws can be made repeatable. */
export type Random = () => number;
