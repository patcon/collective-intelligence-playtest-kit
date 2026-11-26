# @playtest-kit/landing

The page at the root of the deployed kit: one card per app, linking to its `/demo` page
(which has the QR code for phones). A plain Worker (no build step) that renders the page from `env.APPS`.

The list of apps is [`apps.ts`](apps.ts). [`alchemy.run.ts`](alchemy.run.ts) looks up each app's deployed
URL from Alchemy's state store (the app's `Stack` output, via `stackRef`) and hands the Worker the list
with URLs. So deploy the apps first, to the same stage; an app that hasn't been deployed fails the plan.

To list a new app, add it to `apps.ts` and to the root `deploy` and `destroy` scripts.

## Scripts

| Script | What it does |
|---|---|
| `pnpm deploy:setup` | Connect or reauthorise Cloudflare in your Alchemy profile (interactive, once per machine) |
| `pnpm run deploy` / `pnpm run destroy` | Deploy or delete the landing Worker with [Alchemy](https://alchemy.run) |
| `pnpm typecheck` | tsrs, for `alchemy.run.ts` and then `worker/` |
| `pnpm test` | Vitest: parsing `env.APPS` and rendering the page |
| `pnpm lint` | Oxlint, then the `cccc` complexity budget |
