import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { seededRng } from '../../matching/rng.ts';
import { assignBirdsongs, BIRDSONG_COUNT, birdsongUrl, isBirdsongCue, SPECIES_IDS } from './birdsongCue.ts';

describe('assignBirdsongs', () => {
  it('gives every group a different species, up to the number of recordings', () => {
    const songs = assignBirdsongs(BIRDSONG_COUNT, seededRng(1));
    expect(new Set(songs.map((s) => s.species)).size).toBe(BIRDSONG_COUNT);
  });

  it('repeats species only once every recording is in use', () => {
    const songs = assignBirdsongs(BIRDSONG_COUNT + 2, seededRng(2));
    expect(songs).toHaveLength(BIRDSONG_COUNT + 2);
    expect(new Set(songs.slice(0, BIRDSONG_COUNT).map((s) => s.species)).size).toBe(BIRDSONG_COUNT);
  });
});

describe('birdsongUrl', () => {
  it('points at a bundled recording for every species', () => {
    for (const species of SPECIES_IDS) {
      const file = fileURLToPath(new URL(`../../../public${birdsongUrl(species)}`, import.meta.url));
      expect(existsSync(file), file).toBe(true);
    }
  });
});

describe('isBirdsongCue', () => {
  it('accepts a known species and rejects an unknown one', () => {
    expect(isBirdsongCue({ species: 'loon', type: 'birdsong' })).toBe(true);
    expect(isBirdsongCue({ species: 'dodo', type: 'birdsong' })).toBe(false);
    expect(isBirdsongCue({ species: 'toString', type: 'birdsong' })).toBe(false);
  });
});
