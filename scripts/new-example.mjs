#!/usr/bin/env node
// Copy examples/000-template to examples/NNN-<name>, using the next free number.
// Usage: pnpm new-example <name>
import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const examplesDir = join(root, 'examples');
const templateName = '000-template';
const templateDir = join(examplesDir, templateName);
const skip = new Set(['node_modules', 'dist', '.cccc.cache', '.alchemy']);

const slug = (process.argv[2] ?? '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');
if (!slug) {
  console.error('Usage: pnpm new-example <name>');
  process.exit(1);
}

const numbers = readdirSync(examplesDir)
  .map((dir) => /^(\d{3})-/.exec(dir)?.[1])
  .filter(Boolean)
  .map(Number);
const next = String(Math.max(0, ...numbers) + 1).padStart(3, '0');
const name = `${next}-${slug}`;
const targetDir = join(examplesDir, name);

if (existsSync(targetDir)) {
  console.error(`${targetDir} already exists`);
  process.exit(1);
}

cpSync(templateDir, targetDir, {
  filter: (src) => !skip.has(basename(src)) && !src.endsWith('.tsbuildinfo'),
  recursive: true,
});

for (const file of ['package.json', 'index.html', 'src/App.tsx', 'alchemy.run.ts']) {
  const path = join(targetDir, file);
  if (existsSync(path)) {
    writeFileSync(path, readFileSync(path, 'utf8').replaceAll(templateName, name));
  }
}

console.log(`Created examples/${name}

Next:
  pnpm install
  pnpm --filter ${name} dev`);
