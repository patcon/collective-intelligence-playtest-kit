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

## What prototyping settled (2026-11-26)

Decided while trying the prototype on `/demo`. Where this differs from the intent above, this wins.

- **Layout:** `compact`. One row with −/+, pinned above Start so people arriving doesn't move it. A chip cycles between Groups and People per group. When people per group is set, clicking the number cycles its fit: Smart, Min or Max, shown in a chip above it. Both chips look like Kumo's segmented tabs, with the label sliding through a fixed pill. Numbers are at most two digits.
- **Limits:** −/+ are never disabled for headcount, so the emcee can set things before anyone arrives. They stop only at 2 groups and 2 per group. A split that can't work is flagged and blocks Start, rather than being impossible to choose. This replaces "can't be chosen" above.
- **Never one group:** a calculated split always has at least 2 groups.
- **Fits for people per group *k*:**
  - **Smart** (the default): the group count whose average is closest to *k*, never leaving anyone alone. 7 in pairs is `3·2·2`.
  - **Min:** groups of *k* or more, with extras joining groups. With people for only one full group, the rest make a short group (20 at 15 is `15·5`), so the emcee sees how many are short.
  - **Max:** groups of *k* or fewer, with extras making another group.
- **Bar:** one segment per group, each showing its size, and no text line (the bar is labelled for screen readers instead). Fine groups are neutral grey, since blue looked like the Start button. Groups that are a concern are warning orange: under 2 people, short of a Min, or past what the cue can tell apart. Shown even at 0 ready.
- **Blocking Start:** blocked by someone on their own, a single group, or more groups than the cue can tell apart. Short groups are flagged but don't block. Nothing is explained under Start.

## Next: make it real

The prototype keeps its own state, and Start still uses `/demo`'s Group by and Groups / People per group selects. Removing those selects means the control has to set the room's grouping first.

1. **The control drives the room's grouping.** It sends config changes as `/demo`'s panel does, so its state lives in the room, stays in step across hosts, and survives a reload.
2. **The room's grouping learns the fits.** Today `Grouping` is "by size, extras join" or "by count". Add the fit (Smart, Min, Max) to "by size", and move the prototype's splitting maths into `src/matching/`.
3. **Min deals for real.** The matcher deals round-robin, so 20 at Min 15 gives `10·10`, not the `15·5` shown. Min needs a fill-first deal, or should be dropped until it's wanted.
4. **One check for Start.** The room's `startBlocker` and the prototype's checks become the same rules, enforced by the room.
5. **Remove Group by and Groups / People per group from `/demo`.** Algorithm, Cue and Display found count stay.
6. **Graduate the component.** Out of `prototype-group-segment-wizard/`, no dev-only gate, with tests for the splitting maths and the matchmaking spec updated.

**Open questions:**
- Keep only `compact`, parking the other layouts on a throwaway branch? Or keep them selectable?
- Make Min fill groups first for real, or drop Min for now?
