# TODO

## Find where stray sims come from (low priority)

Seen 2026-11-26 in dev: `/demo` listed simulated participants as "Phone sim-…" (a sim no page on screen made) with the tab's sim count at 0, and they stayed after closing other tabs. They were live: every connection to the dev server was held by the regular Chrome, and the room drops a participant as soon as its socket closes (checked with a script that closed one politely and killed another).

**Reproduce:** add sims on `/demo`, then change `?variant=` by editing the URL in the address bar. The page reloads, and the sims from before are orphaned. Switching variants with the prototype's floating bar doesn't do it, since that only rewrites the URL without loading the page again. So it only comes from prototyping with `?variant=`, and may not be worth chasing. Still unexplained: a page loading again would normally close the old page's sockets.

Meanwhile, "Clear N stray sims" beside the Participants heading disconnects them and keeps them out (`remove` in `worker/MatchRoom.ts`).
