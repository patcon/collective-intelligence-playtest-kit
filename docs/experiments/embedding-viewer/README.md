# EmbeddingViewer experiments (2026-11-23)

Measured before deciding how to package and document `EmbeddingViewer`. Stopped early to save effort, so experiment 3 (leaks, StrictMode, `"use no memo"`) was not run.

## 1. `three` as a dependency or a peer dependency

`examples/000-template` rendered `EmbeddingViewer` with six hard-coded points, then ran `pnpm install` and `pnpm --filter 000-template build` for each variant. "Copies" counts `__THREE__` revision strings in the built JS.

| Variant | Template's `three` | Copies | JS raw / gzip |
| --- | --- | --- | --- |
| dependency (now) | none | 1 (r183) | 830 KB / 220 KB |
| dependency | same 0.183.2 | 1 | 830 KB / 220 KB |
| dependency | different 0.182.0 | **2** (r183 + r182) | 906 KB / 242 KB |
| dependency, Vite `resolve.dedupe` | different 0.182.0 | 1 (r182) | 825 KB / 220 KB |
| peer | same 0.183.2 | 1 | 830 KB / 220 KB |
| peer | different 0.182.0 | **2** | 906 KB / 242 KB |
| peer, pnpm injected workspace deps | different 0.182.0 | 1 (r182) | 822 KB / 218 KB |
| peer | missing | 1 (r183, from the package's devDependency) | 830 KB / 220 KB |

Every variant installed and built. A second copy of three costs about 76 KB raw / 22 KB gzip, and only appears when the app's `three` version differs from the package's. Inside this workspace a peer dependency does not prevent that on its own, because the workspace symlink resolves the package's devDependency copy.

Leaning: peer dependency, like `react` and Kumo, with every app pinning the same `three` version. Draft change: [`three-peer-dependency.patch`](three-peer-dependency.patch).

## 2. Autodocs and the WebGL context limit

A throwaway stories file with 20 small viewers, opened on its Docs page in agent-browser's Chrome. Lost contexts were counted from `THREE.WebGLRenderer: Context Lost.` console lines and with [`webgl-context-probe.js`](webgl-context-probe.js).

| Docs option | Contexts lost |
| --- | --- |
| Autodocs, stories inline (default) | 5 of 20 |
| Autodocs, `docs.story.inline: false` (iframes) | 5 of 20 |
| Hand-written MDX page with one live story | 0 |

Iframes don't help, because the context cap is per browser process, not per frame. The first viewers on the page went blank: [`autodocs-inline-lost-contexts.png`](autodocs-inline-lost-contexts.png).

Leaning: take `EmbeddingViewer` out of autodocs and give it one hand-written MDX page with a single live story.
