/**
 * Downsamples the Open-Source Psychometrics IPIP-FFM raw data (about 1M people's answers to the 50 IPIP-BFFM
 * items) into `sources/ipip-ffm-responses.json`, small enough to commit, for simulated participants.
 *
 * The zip (151 MB, 416 MB unzipped) is downloaded once into `.cache/` (gitignored) and reused after that. Only
 * clean rows are sampled: one record from their IP address (`IPC` 1, as the codebook advises) and all 50 items
 * answered. The sample is seeded, so the same size gives the same people.
 *
 * Run by hand (`node scripts/sample-responses.ts [size]`, default 1000) and commit the output. Needs `unzip`.
 */
import { spawn } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { rename } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const DATA_URL = 'https://openpsychometrics.org/_rawdata/IPIP-FFM-data-8Nov2018.zip';
const CSV_IN_ZIP = 'IPIP-FFM-data-8Nov2018/data-final.csv';
const SEED = 2018;

const cacheDir = new URL('../.cache/', import.meta.url);
const zipPath = new URL('IPIP-FFM-data-8Nov2018.zip', cacheDir);
const itemsUrl = new URL('../sources/ipip-bffm-items.json', import.meta.url);
const outUrl = new URL('../sources/ipip-ffm-responses.json', import.meta.url);

/** One sampled person: their country (as the dataset guessed it from their IP) and their 50 answers, 1–5. */
interface Response {
  readonly country: string;
  readonly answers: ReadonlyArray<number>;
}

/** A seeded random number in [0, 1) (mulberry32), so a sample can be made again. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function download(): Promise<void> {
  if (existsSync(zipPath)) {
    return;
  }
  mkdirSync(cacheDir, { recursive: true });
  process.stdout.write(`Downloading ${DATA_URL} into .cache/…\n`);
  const response = await fetch(DATA_URL);
  if (!response.ok || !response.body) {
    throw new Error(`${DATA_URL} answered ${response.status}`);
  }
  const partial = new URL('download.partial', cacheDir);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(partial));
  await rename(partial, zipPath);
}

/** The dataset's CSV, a line at a time, streamed out of the cached zip. */
function csvLines(): AsyncIterable<string> {
  const unzip = spawn('unzip', ['-p', zipPath.pathname, CSV_IN_ZIP], { stdio: ['ignore', 'pipe', 'inherit'] });
  return createInterface({ input: unzip.stdout, crlfDelay: Infinity });
}

/** The row as a response, or null if it isn't clean enough to sample. */
function toResponse(fields: ReadonlyArray<string>, itemAt: ReadonlyArray<number>, ipcAt: number, countryAt: number): Response | null {
  if (fields[ipcAt] !== '1') {
    return null;
  }
  const answers = itemAt.map((at) => Number(fields[at]));
  if (!answers.every((answer) => Number.isInteger(answer) && answer >= 1 && answer <= 5)) {
    return null;
  }
  return { country: fields[countryAt] ?? 'NONE', answers };
}

async function sample(items: ReadonlyArray<string>, size: number): Promise<{ rows: number; eligible: number; responses: Array<Response> }> {
  const random = seededRandom(SEED);
  const reservoir: Array<{ row: number; response: Response }> = [];
  let header: Array<string> | null = null;
  let itemAt: Array<number> = [];
  let [ipcAt, countryAt, rows, eligible] = [-1, -1, 0, 0];

  for await (const line of csvLines()) {
    const fields = line.split('\t');
    if (!header) {
      header = fields;
      const column = (name: string): number => {
        const at = fields.indexOf(name);
        if (at === -1) {
          throw new Error(`${CSV_IN_ZIP} has no "${name}" column`);
        }
        return at;
      };
      itemAt = items.map(column);
      [ipcAt, countryAt] = [column('IPC'), column('country')];
      continue;
    }
    rows++;
    const response = toResponse(fields, itemAt, ipcAt, countryAt);
    if (!response) {
      continue;
    }
    eligible++;
    // Reservoir sampling: every eligible row ends up in the sample with the same chance, in one pass.
    if (reservoir.length < size) {
      reservoir.push({ row: rows, response });
    } else {
      const slot = Math.floor(random() * eligible);
      if (slot < size) {
        reservoir[slot] = { row: rows, response };
      }
    }
  }
  reservoir.sort((a, b) => a.row - b.row);
  return { rows, eligible, responses: reservoir.map(({ response }) => response) };
}

const size = Number(process.argv[2] ?? 1000);
if (!Number.isInteger(size) || size < 1) {
  throw new Error(`Sample size must be a positive whole number, not "${process.argv[2]}"`);
}
/** Item ids in the order the items file lists them, which is the order each response's answers follow. */
const items: ReadonlyArray<string> = JSON.parse(readFileSync(itemsUrl, 'utf8')).items.map((item: { id: string }) => item.id);
await download();
const { rows, eligible, responses } = await sample(items, size);
const head = {
  source: DATA_URL,
  about: 'https://openpsychometrics.org/_rawdata/',
  sampled: { rows, eligible, size: responses.length, seed: SEED, filter: 'IPC = 1 and all 50 items answered' },
};
// `items` on one line and one response per line keep the file short and its diffs readable.
const json = [
  JSON.stringify(head, null, 2).replace(/\n}$/, ','),
  `  "items": ${JSON.stringify(items)},`,
  '  "responses": [',
  responses.map((response) => `    ${JSON.stringify(response)}`).join(',\n'),
  '  ]',
  '}',
].join('\n');
writeFileSync(outUrl, `${json}\n`);
process.stdout.write(`Sampled ${responses.length} of ${eligible} clean rows (${rows} in all) into sources/ipip-ffm-responses.json\n`);
