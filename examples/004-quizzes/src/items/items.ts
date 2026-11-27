import itemsFile from '../../sources/ipip-bffm-items.json' with { type: 'json' };

/** The five traits, in the order the test takes turns between them. */
export const TRAITS = ['EXT', 'AGR', 'CSN', 'EST', 'OPN'] as const;
export type Trait = (typeof TRAITS)[number];

type ItemNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
/** A statement's id in the test, such as `EXT1` or `OPN10`: ten per trait. */
export type ItemId = `${Trait}${ItemNumber}`;

/** One of the test's 50 statements. */
export interface Item {
  id: ItemId;
  /** Its place in the test, from 1. */
  order: number;
  trait: Trait;
  /** `1` if agreeing scores towards the trait, `-1` if it scores against it ("reversed"). */
  keyed: 1 | -1;
  text: string;
}

const ITEM_ID = /^(?:EXT|AGR|CSN|EST|OPN)(?:[1-9]|10)$/;

function isTrait(value: string): value is Trait {
  return (TRAITS as ReadonlyArray<string>).includes(value);
}

function isItemIdShape(value: string): value is ItemId {
  return ITEM_ID.test(value);
}

/** One item from the file, checked, so a typo in the file fails loudly at load rather than mid-quiz. */
function toItem(raw: { id: string; order: number; factor: string; keyed: number; text: string }): Item {
  const { id, order, factor, keyed, text } = raw;
  if (!isItemIdShape(id) || !isTrait(factor) || !id.startsWith(factor) || (keyed !== 1 && keyed !== -1)) {
    throw new Error(`Bad item in ipip-bffm-items.json: ${JSON.stringify(raw)}`);
  }
  return { id, keyed, order, text, trait: factor };
}

/** All 50 statements, in the test's order. */
export const ITEMS: ReadonlyArray<Item> = itemsFile.items.map(toItem).toSorted((a, b) => a.order - b.order);

/** The five answers, 1 (Disagree) to 5 (Agree), with the test's own labels. */
export const ANSWER_SCALE = ([1, 2, 3, 4, 5] as const).map((value) => {
  const step = itemsFile.scale.find((s) => s.value === value);
  if (!step) {
    throw new Error(`ipip-bffm-items.json has no answer ${value}`);
  }
  return { label: step.label, value };
});

/** Each trait's full name, such as "Emotional stability" for `EST`. */
export const TRAIT_NAMES: Readonly<Record<Trait, string>> = itemsFile.factors;

const ITEMS_BY_ID = new Map(ITEMS.map((item) => [item.id, item]));

/** Whether `value` is the id of one of the test's statements. */
export function isItemId(value: string): value is ItemId {
  return isItemIdShape(value) && ITEMS_BY_ID.has(value);
}

/** The statement with this id. Every `ItemId` is in the file, as `ITEMS` is checked at load. */
export function itemById(id: ItemId): Item {
  const item = ITEMS_BY_ID.get(id);
  if (!item) {
    throw new Error(`No statement ${id}`);
  }
  return item;
}
