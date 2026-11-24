import path from 'node:path';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

// Headless Chromium renders WebGL on SwiftShader, about 4 fps for a full-window
// viewer, which starves the replay stories' timers. On macOS, ANGLE's Metal
// backend puts it on the GPU (60 fps). Elsewhere SwiftShader still works, slowly.
const gpuArgs = process.platform === 'darwin' ? ['--use-angle=metal'] : [];

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          plugins: [storybookTest({ configDir: path.join(import.meta.dirname, '.storybook') })],
          test: {
            name: 'storybook',
            testTimeout: 60_000,
            browser: {
              enabled: true,
              headless: true,
              provider: playwright({ launchOptions: { args: gpuArgs } }),
              instances: [{ browser: 'chromium' }],
            },
          },
        },
      ],
    },
  }),
);
