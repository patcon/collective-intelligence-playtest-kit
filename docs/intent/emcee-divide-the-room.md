# Intent: Emcee "divide the room" control

Confirmed 2026-11-26 via an interview session. Builds on [matchmaking](matchmaking.md). The component is named `GroupSegmentWizard`; its prototype is in `examples/002-matchmaking/src/demo/prototype-group-segment-wizard/`, with the `compact` layout as the default.

- **Outcome:** a "divide the room" control in `examples/002-matchmaking`'s `EmceePane` (`/emcee`), used in the lobby before tapping Start. It replaces the grouping selects in `/demo`'s config panel. `/demo` is an exploratory harness that won't be in a production event app; the emcee view prototypes what an emcee will actually use at an event.
- **Core interaction:** two linked numbers, **groups** and **people per group**. The emcee sets one with −/+, and the other is calculated from the ready count and shown disabled. Pressing a number's −/+ makes it the one the emcee sets. A single shared −/+ pair that acts on whichever number is selected is also acceptable. Locking one number and calculating the other is the point; the layout is open.
- **Preview:** a glanceable bar or one-liner showing how the people ready now split (e.g. `3·3·3·4`). Uneven groups are simply visible, with no callouts.
- **Limits:** settings that can't work (e.g. more groups than the cue can tell apart) can't be chosen. Otherwise the emcee decides what counts as a problem; no warnings.
- **Subtle extra:** when setting people per group, a quiet way to choose how leftovers are handled. Either "at least *k*", where extra people overflow into some groups (today's behaviour), or "at most *k*", where an extra group is made instead. Most people won't care, so it mustn't add noise on first use.
- **Prototypes:** a progressive-disclosure series running from simplest (one control and the preview) to versions that layer in the locked/calculated pair and the min/max nuance, to find where each layer stops earning its place.
- **Out of scope:**
  - Adjusting mid-round or during the activity (warnings that groups will reshuffle, or keeping groups stable as late arrivals come in). Worth revisiting later.
  - Warning callouts
  - Moving the cue and algorithm pickers to the emcee view

## Note from the interview

For a fixed headcount *n*, both modes reach the same set of splits: matching deals people round-robin into *g* groups, so "size 3" and "4 groups" are the same split for 12 people. The modes differ in what stays fixed as more people become ready: size mode adds groups, count mode grows them.
