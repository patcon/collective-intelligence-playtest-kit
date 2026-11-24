#!/usr/bin/env node
// Usage: node scripts/import-graph.mjs <entry> [<entry>...] [--forbid=<regex>]
// Prints the transitive closure of relative imports from each entry and the
// bare packages that closure pulls in. Exits 1 if any import matches --forbid.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const args = process.argv.slice(2);
const forbidArg = args.find((a) => a.startsWith('--forbid='));
const forbid = forbidArg ? new RegExp(forbidArg.slice('--forbid='.length)) : null;
const entries = args.filter((a) => !a.startsWith('--')).map((a) => resolve(a));

const IMPORT_RE = /(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|new URL\(\s*['"]([^'"]+)['"]/g;
const EXTS = ['', '.ts', '.tsx', '.js', '.mjs', '/index.ts', '/index.tsx'];

function resolveLocal(from, spec) {
  const base = resolve(dirname(from), spec);
  for (const ext of EXTS) {
    const p = base + ext;
    if (existsSync(p) && statSync(p).isFile()) return p;
  }
  return null;
}

const root = process.cwd();
const edges = new Map();
const packages = new Map();
const violations = [];
const queue = [...entries];

while (queue.length > 0) {
  const file = queue.shift();
  if (edges.has(file)) continue;
  const deps = [];
  edges.set(file, deps);
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(IMPORT_RE)) {
    const spec = m[1] ?? m[2] ?? m[3];
    if (forbid?.test(spec)) violations.push(`${relative(root, file)} -> ${spec}`);
    if (spec.startsWith('.')) {
      const target = resolveLocal(file, spec);
      if (target) {
        deps.push(target);
        queue.push(target);
      }
    } else {
      const pkg = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
      if (!packages.has(pkg)) packages.set(pkg, new Set());
      packages.get(pkg).add(relative(root, file));
    }
  }
}

console.log('# Local modules');
for (const [file, deps] of edges) {
  const lines = readFileSync(file, 'utf8').split('\n').length;
  console.log(`${relative(root, file)} (${lines} lines)`);
  for (const d of deps) console.log(`  -> ${relative(root, d)}`);
}
console.log('\n# Packages');
for (const [pkg, from] of packages) console.log(`${pkg}  <- ${[...from].join(', ')}`);

if (violations.length > 0) {
  console.log('\n# Forbidden imports');
  for (const v of violations) console.log(v);
  process.exit(1);
}
