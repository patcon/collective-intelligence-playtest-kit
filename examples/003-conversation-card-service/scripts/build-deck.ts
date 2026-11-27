/**
 * Turns `sources/the-and-cards.csv` into the deck the Worker serves (`worker/data/the-and-deck.json`).
 * Run by hand when the CSV changes (`pnpm build:deck`), and commit the output.
 *
 * `source` says where a card's text comes from: `the-and` for the printed deck, or the person who wrote a custom card
 * (edition `custom`). It's for record-keeping only and isn't read here.
 *
 * Placeholder rows (no text or no icon) are kept in the CSV for record-keeping and left out of the deck.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const csvUrl = new URL('../sources/the-and-cards.csv', import.meta.url);
const deckUrl = new URL('../worker/data/the-and-deck.json', import.meta.url);

/** Splits CSV text into rows of fields, honouring quoted fields and `""` escapes. */
function parseCsv(csv: string): Array<Array<string>> {
  const text = csv.replaceAll('\r\n', '\n');
  const rows: Array<Array<string>> = [];
  let row: Array<string> = [];
  for (let start = 0; start < text.length; ) {
    const [field, end] = readField(text, start);
    row.push(field);
    if (text[end] !== ',') {
      rows.push(row);
      row = [];
    }
    start = end + 1;
  }
  return rows;
}

/** The field starting at `start`, and the index just past it (a `,`, a newline, or the end of the text). */
function readField(text: string, start: number): [string, number] {
  if (text[start] !== '"') {
    const length = text.slice(start).search(/[,\n]/);
    const end = length === -1 ? text.length : start + length;
    return [text.slice(start, end), end];
  }
  let value = '';
  for (let at = start + 1; ; ) {
    const close = text.indexOf('"', at);
    if (close === -1) {
      return [value + text.slice(at), text.length];
    }
    value += text.slice(at, close);
    if (text[close + 1] !== '"') {
      return [value, close + 1];
    }
    value += '"';
    at = close + 2;
  }
}

const [header = [], ...records] = parseCsv(readFileSync(csvUrl, 'utf8'));
const column = (name: string): number => {
  const index = header.indexOf(name);
  if (index === -1) {
    throw new Error(`the-and-cards.csv has no "${name}" column`);
  }
  return index;
};
const [idAt, iconAt, textAt] = [column('card_id'), column('icon'), column('text')];

const deck = records
  .map((record) => ({ id: record[idAt] ?? '', text: (record[textAt] ?? '').trim(), type: record[iconAt] ?? '' }))
  .filter((card) => card.id && card.text && card.type);

writeFileSync(deckUrl, `${JSON.stringify(deck, null, 2)}\n`);
process.stdout.write(`Wrote ${deck.length} cards to worker/data/the-and-deck.json\n`);
