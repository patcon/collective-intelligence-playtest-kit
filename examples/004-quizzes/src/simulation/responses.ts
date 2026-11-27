import responsesFile from '../../sources/ipip-ffm-responses.json' with { type: 'json' };
import { isItemId } from '../items/items.ts';
import type { ItemId } from '../items/items.ts';
import type { Answer, Answers } from '../room/protocol.ts';

/** One real person from the sampled IPIP-FFM data, whose answers a sim gives. */
export interface Person {
  /** Their index in `ipip-ffm-responses.json`. */
  row: number;
  /** Two letters, guessed by the site from their IP, or `NONE`. */
  country: string;
  /** Every statement, answered 1–5 or skipped (`null`). */
  answers: Answers;
  /** How many of the 50 they skipped. */
  skipped: number;
}

function isAnswer(value: number | null): value is Answer {
  return value === null || (Number.isInteger(value) && value >= 1 && value <= 5);
}

function toItemIds(ids: ReadonlyArray<string>): Array<ItemId> {
  return ids.map((id) => {
    if (!isItemId(id)) {
      throw new Error(`Unknown statement ${id} in ipip-ffm-responses.json`);
    }
    return id;
  });
}

/** One response from the file, checked, so a bad row fails loudly at load rather than mid-quiz. */
function toPerson(items: ReadonlyArray<ItemId>, raw: { country: string; answers: ReadonlyArray<number | null> }, row: number): Person {
  if (raw.answers.length !== items.length || !raw.answers.every(isAnswer)) {
    throw new Error(`Bad response ${row} in ipip-ffm-responses.json`);
  }
  const answers = Object.fromEntries(items.map((item, i) => [item, raw.answers[i] ?? null]));
  return { answers, country: raw.country, row, skipped: raw.answers.filter((a) => a === null).length };
}

const ITEM_ORDER = toItemIds(responsesFile.items);

/** Everyone in the sample, in the file's order. */
export const PEOPLE: ReadonlyArray<Person> = responsesFile.responses.map((raw, row) => toPerson(ITEM_ORDER, raw, row));

/** Whether `person` skipped no more than `maxSkipped` statements; `null` is no limit. */
export function withinSkips(person: Person, maxSkipped: number | null): boolean {
  return maxSkipped === null || person.skipped <= maxSkipped;
}

/** Someone at random who skipped at most `maxSkipped` and isn't in `taken` (rows), or null if no one's left. */
export function drawPerson(people: ReadonlyArray<Person>, taken: ReadonlySet<number>, maxSkipped: number | null, rng: () => number): Person | null {
  const free = people.filter((p) => !taken.has(p.row) && withinSkips(p, maxSkipped));
  return free[Math.floor(rng() * free.length)] ?? null;
}
