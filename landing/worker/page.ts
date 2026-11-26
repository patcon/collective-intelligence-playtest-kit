/** An app as the Worker receives it in `env.APPS`, with the URL it was deployed to. */
export interface DeployedApp {
  readonly title: string;
  readonly blurb: string;
  readonly url: string;
}

/** An app's fields, before they're checked. */
interface RawApp {
  title?: unknown;
  blurb?: unknown;
  url?: unknown;
}

function isDeployedApp(value: unknown): value is DeployedApp {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { title, blurb, url }: RawApp = value;
  return typeof title === 'string' && typeof blurb === 'string' && typeof url === 'string';
}

/** Parses `env.APPS` (JSON written by alchemy.run.ts), throwing if it isn't a list of apps. */
export function parseApps(raw: string): Array<DeployedApp> {
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || !value.every(isDeployedApp)) {
    throw new TypeError('env.APPS is not a list of { title, blurb, url }');
  }
  return value;
}

const ESCAPES = new Map([
  ['&', '&amp;'],
  ['<', '&lt;'],
  ['>', '&gt;'],
  ['"', '&quot;'],
  ["'", '&#39;'],
]);

function escapeHtml(text: string): string {
  return text.replaceAll(/[&<>"']/g, (char) => ESCAPES.get(char) ?? char);
}

function renderApp({ title, blurb, url }: DeployedApp): string {
  const link = url ? `<a href="${escapeHtml(new URL('/demo', url).href)}">Open the demo</a>` : '<span>Not deployed yet</span>';
  return `<li>
    <h2>${escapeHtml(title)}</h2>
    <p>${escapeHtml(blurb)}</p>
    <nav>${link}</nav>
  </li>`;
}

const STYLES = `
  :root { color-scheme: light dark; --bg: #fafafa; --fg: #1a1a1a; --muted: #5c5c5c; --card: #fff; --line: #e2e2e2; --link: #0051c3; }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #111; --fg: #ededed; --muted: #a3a3a3; --card: #1b1b1b; --line: #2e2e2e; --link: #82b6ff; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.5 system-ui, sans-serif; }
  main { max-width: 40rem; margin: 0 auto; padding: 3rem 1rem; }
  h1 { margin: 0 0 0.25rem; font-size: 1.75rem; }
  main > p { margin: 0 0 2rem; color: var(--muted); }
  ul { display: grid; gap: 1rem; margin: 0; padding: 0; list-style: none; }
  li { padding: 1.25rem; border: 1px solid var(--line); border-radius: 0.75rem; background: var(--card); }
  h2 { margin: 0 0 0.25rem; font-size: 1.15rem; }
  li p { margin: 0 0 0.75rem; color: var(--muted); }
  nav { display: flex; flex-wrap: wrap; gap: 0.5rem 1.25rem; }
  a { color: var(--link); font-weight: 600; }
`;

/** The whole landing page: one card per app, linking to its demo page. */
export function renderPage(apps: ReadonlyArray<DeployedApp>): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Playtest Kit</title>
  <style>${STYLES}</style>
</head>
<body>
  <main>
    <h1>Collective Intelligence Playtest Kit</h1>
    <p>Experiments in realtime tools for alternative ways of being together.</p>
    <ul>${apps.map(renderApp).join('')}</ul>
  </main>
</body>
</html>`;
}
