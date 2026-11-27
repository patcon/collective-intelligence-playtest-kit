/** An app the landing page links to. `stack` is the name its `alchemy.run.ts` passes to `Stack`. */
export interface ListedApp {
  readonly stack: string;
  readonly title: string;
  readonly blurb: string;
}

/** Each must be deployed (to the same stage) before the landing page, which reads its URL from Alchemy's state. */
export const APPS: ReadonlyArray<ListedApp> = [
  {
    stack: '001-valence-remote',
    title: '001 · Valence remote',
    blurb: 'Phones as valence remotes: tilt, flip or touch to say how you feel, and watch the room live.',
  },
  {
    stack: '002-matchmaking',
    title: '002 · Matchmaking',
    blurb: 'Each group gets a cue (a colour, an avatar, a birdsong or a buzz), and people find the others who share it.',
  },
  {
    stack: '003-conversation-card-service',
    title: '003 · Conversation card service',
    blurb: 'Draw conversation cards at random from a deck, by card type or a short list, without repeats.',
  },
];
