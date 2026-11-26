# Collective Intelligence Playtest Kit

My intention for this repository is to be an evolving toolkit for running a weekly event for playtesting realtime tools for collective intelligence. It aspires to be:
- a description of the event and its goals, and how it runs
- a place for UI patterns and components to be gathered
- a place for the weekly app to be scaffolded
- a workspace for agents to be able to easily generate new apps, using developed best-practices and past examples

## Deploying

Each app in `examples/` deploys as its own Cloudflare Worker (with its Durable Object), and
[`landing/`](landing) deploys a page linking to each. From the repo root:

```sh
pnpm deploy:setup   # once per machine: connect Alchemy to your Cloudflare account
pnpm run deploy     # 001, then 002, then the landing page; prints each URL
pnpm run destroy    # the reverse
```

Use `pnpm run deploy`, not `pnpm deploy` (a pnpm built-in). Everything deploys to the stage
`$ALCHEMY_STAGE`, or `live_$USER` by default; set `ALCHEMY_STAGE=prod` to deploy a shared copy.
The landing page reads the apps' URLs from that same stage.
