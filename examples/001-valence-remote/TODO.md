# TODO

## Ideas: smaller `/remote`, faster connect

Not yet worth doing: the remote will grow, and the examples should keep the full Agents SDK. Measured 2026-11-24 with `vite build`. Before the `lazy()` page split, both routes shared one bundle: 164 KB JS + 20 KB CSS brotli.

- **Remove the extra round trip that the `lazy()` page split added.** The page chunk is only requested once `index.js` has run. Linking it as `modulepreload` from the HTML, chosen per route, would fetch it alongside `index.js`.
- **Connect before the UI loads.** Render `RoomProvider` first and `lazy()`-load the remote UI, so `useAgent` opens the socket while the UI chunk downloads. The phone shows as `joined` on the dashboard sooner.
- **`agents` bundles `capnweb` (52 KB raw) even when the capnweb transport isn't used.** This is upstream; consider an issue asking for it to be lazy-loaded or a separate entry.
- **`styles.css` runs `@source` over all of `kumo/dist`**, so every page gets CSS for every Kumo component: 158 KB raw / 20 KB brotli, against 29 KB / 6 KB for tokens and theme alone. Narrowing `@source` to the chunks of the components in use didn't change the output (Tailwind v4.3.5), so there's no easy trim. Low priority: the CSS is small once compressed and gets cached.
- Only if the remote stays small: a plain `WebSocket` opened from an inline `<script>` instead of `useAgent`, no Kumo on the remote, Preact.

## Ideas: the remote's UI with Kumo

- **Turn the notes' fixes into buttons.** Notes ask the holder to edit the URL ("Try ?detection=touch") or reload. Give their banners an action instead: "Use touch instead" switches mode in place, and "Try again" asks for motion access again (or reloads where the browser won't ask twice).
- **The start screen as a Kumo card.** A first try is in `git stash` ("remote start screen as Kumo card"): a `LayerCard` with the title and a mode `Badge` in the header, a gesture icon, the instruction, a full-width start button, and the warning as a banner, plus the connection badge in the corner via a shared `CornerBadges`. Not kept: it didn't look right yet.

## Ideas: feeling the resolution

- **Vibrate when the sent level changes** (`navigator.vibrate`, Android only; iOS Safari has no vibration API). At coarse resolutions (`?levels=3`) the holder would feel each step crossed, with nothing added to the screen. Skip it at fine resolutions, where it would buzz constantly.
