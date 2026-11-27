# Collective Intelligence Playtest Kit

A kit of small, realtime web apps for playtesting facilitated group activities (matchmaking people into groups, prompting small-group conversation, and so on), and the shared pieces they're built from.

## Conversation cards

**Card**:
One conversation prompt from a deck: an ID, the prompt text, and a card type.
_Avoid_: statement (in Polis that's something people vote on), question, prompt

**Deck**:
The full set of cards an app draws from. Currently one deck: The And, Self edition.
_Avoid_: set, collection, edition

**Card type**:
The single category a card belongs to, named after the icon printed on it (`gem`, `heart`, …).
_Avoid_: tag, icon, theme, category; and don't confuse with a matchmaking cue type

**Glyph**:
The line drawing that represents a card type. Each card type has exactly one chosen glyph, though alternate drawings may be archived.
_Avoid_: icon (the type is named after the printed icon, but the drawing is the glyph), badge

**Pool**:
The cards eligible for a draw after filtering by card type, chosen IDs and excluded IDs. Its size is reported whether or not the draw is limited.
_Avoid_: matches, candidates, subset

**Draw**:
Picking cards at random from the pool, with no repeats within one draw.
_Avoid_: deal, shuffle, pick

**Seen cards**:
Cards a client has already shown, which it excludes from later draws so they don't repeat.
_Avoid_: used, discarded, history

**Printed look**:
Showing a card as it appears on the physical card: paper, a double-line frame and the glyph in a badge at the top.
_Avoid_: card skin, theme
