# @playtest-kit/common

Non-visual code shared by more than one example: the room connection, effect hooks, and helpers for
the Worker. Visual components live in [`@playtest-kit/ui`](../ui), which may depend on this package;
this package never depends on `ui`.

Published as TypeScript source (no build step), like `ui`.

| Export | For |
| --- | --- |
| `@playtest-kit/common` | Browser code |
| `@playtest-kit/common/server` | Worker and Durable Object code (no React, no DOM) |

## What's here

| Name | What it does |
| --- | --- |
| `parseJsonObject(raw)` | Socket text as a JSON object, or `null`. Assign it to an interface of `unknown` fields, then validate them. |

Only move something here once a second example needs it.
