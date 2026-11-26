# Intent: Matchmaking example

Confirmed 2026-11-25 via an interview session.

- **Outcome:** `examples/002-matchmaking`. `/` redirects to `/demo-ui`, a desktop page where an evaluator watches a realtime matchmaking flow work end to end.
- **User:** An evaluator trying to understand how the tool works. Not run at a real event, and not run as a playtest.
- **Why now:** To find the shared shape that each week's playtest app (built from a template) will follow, and to start a small framework from what `001-valence-remote` and this example actually share.
- **Participant flow (`/participate`, joined by QR code):** permissions screen → "Waiting for the emcee…" → cue → "found them", which shows the group's size.
- **`/demo-ui` config panels:**
  - Algorithm (random first).
  - Grouping by group size (2..N) *or* by number of groups. When grouping by size, leftovers are added to existing groups. When grouping by number of groups, people are spread as evenly as possible.
  - Cue type.
- **`EmceePane`:** a minimal, mobile-first component that runs the flow (start, move on, reset rounds) and shows group progress (e.g. "4 of 6 groups confirmed"). The emcee can move on without waiting for every confirmation.
- **Simulation:** headless WebSocket clients in the browser, kept in their own module and shown as status cards (no rendered phones). They use the same protocol as real phones, and the Durable Object has no simulation code. Target: up to ~20 simulated participants.
- **Cues:** a pluggable interface. Colours and DiceBear avatars first, then birdsong (a shared sound played on every phone in the group, which also tests audio unlock).
- **Framework:** only the pieces both examples share go into `/common` and `/ui` (likely phases, the message protocol, the permissions/start screen, QR join). `001-valence-remote` is updated to use them. Anything only matchmaking needs can be bespoke. Algorithms and cue types should be easy to extract later but stay in the example for now.
- **Success:** rounds run with 0 to 20 participants, real and simulated mixed, and both examples use the shared pieces.
- **Out of scope:**
  - The activity after matching
  - A real emcee/admin UI
  - Server-side simulation
  - Rendering simulated phones
  - Image-set cues (URLs/uploads) and related-set cues (both planned for later)
  - Running this as a playtest
  - A dynamic app builder
  - Generalizing beyond what the two examples share
