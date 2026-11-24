import cloudflare from '@cloudflare/oxlint-config';
import { defineConfig } from 'oxlint';

// Effects may only be written inside src/hooks/effects/, as named custom hooks.
// Everywhere else, derive state during render or handle work in event handlers.
const effectHooks = ['useEffect', 'useLayoutEffect', 'useInsertionEffect'];
const effectsDir = 'src/hooks/effects/**';

export default defineConfig({
  ...cloudflare,
  ignorePatterns: [...(cloudflare.ignorePatterns ?? []), 'dist/**'],
  overrides: [
    ...(cloudflare.overrides ?? []),
    {
      files: [effectsDir],
      rules: {
        'no-restricted-imports': 'off',
        'no-restricted-properties': 'off',
      },
    },
  ],
  rules: {
    ...cloudflare.rules,
    'no-inline-comments': 'error',
    'react/void-use-memo': 'error',
    'no-restricted-properties': [
      'error',
      ...effectHooks.map((property) => ({
        message: `Effects are only allowed in ${effectsDir}. Wrap the effect in a named hook there.`,
        object: 'React',
        property,
      })),
    ],
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            importNames: effectHooks,
            message: `Effects are only allowed in ${effectsDir}. Wrap the effect in a named hook there.`,
            name: 'react',
          },
        ],
      },
    ],
  },
});
