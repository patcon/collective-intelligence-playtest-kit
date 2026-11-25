import shared from '@playtest-kit/config/oxlint';
import { defineConfig } from 'oxlint';
import type { OxlintOverride } from 'oxlint';

const effectHooks = ['useEffect', 'useLayoutEffect', 'useInsertionEffect'];

/**
 * The simulation talks to the room the way a phone does, so it may only use the protocol (and the
 * effect hooks every module may use), never the room's logic, cues or pages. This repeats the
 * shared effects rule, since an override replaces a rule's options rather than adding to them.
 */
const simulationBoundary: OxlintOverride = {
  files: ['src/simulation/**'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            importNames: effectHooks,
            message: 'Effects are only allowed in src/hooks/effects/**. Wrap the effect in a named hook there.',
            name: 'react',
          },
        ],
        patterns: [
          {
            group: ['../**', '!../room/protocol.ts', '!../hooks/effects/**'],
            message: 'The simulation may only import room/protocol.ts from the rest of the app.',
          },
        ],
      },
    ],
  },
};

export default defineConfig({ ...shared, overrides: [...(shared.overrides ?? []), simulationBoundary] });
