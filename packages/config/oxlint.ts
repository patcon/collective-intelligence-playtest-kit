import cloudflare from '@cloudflare/oxlint-config';
import { defineConfig } from 'oxlint';

// Effects may only be written inside src/hooks/effects/, as named custom hooks.
// Everywhere else, derive state during render or handle work in event handlers.
const effectHooks = ['useEffect', 'useLayoutEffect', 'useInsertionEffect'];
const effectsDir = 'src/hooks/effects/**';

// Each package lints from its own root, so the Tailwind entry point is package-relative.
const tailwindEntryPoint = 'src/styles.css';

export default defineConfig({
  ...cloudflare,
  jsPlugins: [
    ...(cloudflare.jsPlugins ?? []),
    { name: 'better-tailwindcss', specifier: import.meta.resolve('eslint-plugin-better-tailwindcss') },
  ],
  settings: {
    ...cloudflare.settings,
    'better-tailwindcss': { entryPoint: tailwindEntryPoint },
  },
  ignorePatterns: [...(cloudflare.ignorePatterns ?? []), 'dist/**', 'storybook-static/**'],
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
    'better-tailwindcss/enforce-canonical-classes': 'error',
    'better-tailwindcss/no-unnecessary-whitespace': 'error',
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
