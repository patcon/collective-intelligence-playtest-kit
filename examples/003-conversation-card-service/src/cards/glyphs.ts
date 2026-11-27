/**
 * The chosen glyph for each card type, as SVG text keyed by type (`icons/gem.svg` → `gem`). Bundled
 * into the page, so drawing one needs no request.
 */
export const GLYPHS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(import.meta.glob<string>('./icons/*.svg', { eager: true, import: 'default', query: '?raw' })).map(
    ([path, svg]) => [path.replace(/^.*\/(.+)\.svg$/, '$1'), svg],
  ),
);
