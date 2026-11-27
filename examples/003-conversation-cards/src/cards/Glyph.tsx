import { cn } from '@cloudflare/kumo';

/** The chosen glyph for each card type, keyed by type. Bundled as SVG text, so they need no requests. */
const GLYPHS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(import.meta.glob<string>('./icons/*.svg', { eager: true, import: 'default', query: '?raw' })).map(
    ([path, svg]) => [path.replace(/^.*\/(.+)\.svg$/, '$1'), svg],
  ),
);

/**
 * The line drawing for a card type, drawn in the current text colour. Renders nothing for a type
 * with no glyph. The SVG is our own bundled file, so injecting it as markup is safe.
 */
export function Glyph({ type, className }: { type: string; className?: string }) {
  const svg = GLYPHS[type];
  if (!svg) {
    return null;
  }
  return (
    <span aria-hidden className={cn('inline-block [&>svg]:size-full', className)} dangerouslySetInnerHTML={{ __html: svg }} />
  );
}
