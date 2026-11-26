import { shuffle } from '../../matching/rng.ts';
import type { Rng } from '../../matching/rng.ts';

/**
 * The bundled recordings (`public/birdsong/<id>.mp3`, credited in its ATTRIBUTION.md), chosen to
 * sound nothing alike: a call, a hoot, a wail, a whistle and two songs.
 */
export const SPECIES = {
  'barred-owl': 'Barred owl',
  blackbird: 'Blackbird',
  cardinal: 'Cardinal',
  chickadee: 'Chickadee',
  cuckoo: 'Cuckoo',
  loon: 'Loon',
} as const;

export type Species = keyof typeof SPECIES;

/** Every species with a recording. */
export const SPECIES_IDS: ReadonlyArray<Species> = Object.keys(SPECIES).filter(isSpecies);

/** A group's birdsong: every phone in the group plays the same species on a loop. */
export interface BirdsongCue {
  type: 'birdsong';
  species: Species;
}

function isSpecies(value: unknown): value is Species {
  return typeof value === 'string' && Object.hasOwn(SPECIES, value);
}

/** Where a species' recording is served from. */
export function birdsongUrl(species: Species): string {
  return `/birdsong/${species}.mp3`;
}

/** One species per group, all different while there are enough; past that, they repeat in a new order. */
export function assignBirdsongs(groupCount: number, rng: Rng): Array<BirdsongCue> {
  const out: Array<BirdsongCue> = [];
  while (out.length < groupCount) {
    const species = shuffle(SPECIES_IDS, rng).slice(0, groupCount - out.length);
    out.push(...species.map((s): BirdsongCue => ({ species: s, type: 'birdsong' })));
  }
  return out;
}

export const BIRDSONG_COUNT = SPECIES_IDS.length;

export function isBirdsongCue(value: unknown): value is BirdsongCue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'birdsong' &&
    'species' in value &&
    isSpecies(value.species)
  );
}
