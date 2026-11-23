#!/usr/bin/env node
// Usage: node scripts/record-v9-fixture/compact.mjs <raw.json> <out.json>
// Turns a raw recording of egregorigami v9's embedding worker (see README.md
// here) into a story fixture: labels trimmed to their first words, keys made
// stable strings, and only the marks that changed what was laid out kept.
import { readFileSync, writeFileSync } from 'node:fs';

const LABEL_WORDS = 12;
const [rawPath, outPath] = process.argv.slice(2);
const raw = JSON.parse(readFileSync(rawPath, 'utf8'));

const visibleKey = (l) => (l.visible ?? []).join(',');
const marks = raw.marks.filter(
  (m) => m.beforeLayout > 0 && visibleKey(raw.layouts[m.beforeLayout - 1]) !== visibleKey(raw.layouts[m.beforeLayout]),
);
const t0 = raw.layouts[0].atMs;

const fixture = {
  source: 'egregorigami-exploration #v9, Living Room Conversations (window 100, overlap 80), MiniLM-L12',
  tracks: [...new Set(raw.tracks)].sort().map((k) => ({ label: `Session ${String.fromCharCode(65 + k)}` })),
  entries: raw.texts.map((text, i) => ({
    track: raw.tracks[i],
    label: text.split(/\s+/).slice(0, LABEL_WORDS).join(' ') + '…',
  })),
  layouts: raw.layouts.map((l) => ({
    atMs: l.atMs - t0,
    visibleTracks: l.visible,
    keys: l.keys,
    positions: l.points,
  })),
  marks: marks.map((m) => ({ beforeLayout: m.beforeLayout, note: m.note.replace(/ \(ref\)$/, '') })),
};
writeFileSync(outPath, JSON.stringify(fixture));
console.log({ entries: fixture.entries.length, layouts: fixture.layouts.length, marks: fixture.marks, bytes: JSON.stringify(fixture).length });
