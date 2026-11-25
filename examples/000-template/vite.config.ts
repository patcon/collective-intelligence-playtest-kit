import { DurableObjectNamespace } from '@alchemy.run/cloudflare-runtime/core/bindings';
import cloudflare from '@alchemy.run/cloudflare-runtime/vite';
import shared from '@playtest-kit/config/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig, mergeConfig } from 'vite';
import type { PluginOption } from 'vite';
import { offline } from './offline.ts';
import { PORT } from './port.ts';

const lan = process.env.LAN === '1';
const preview = process.env.PREVIEW === '1';

/**
 * PREVIEW=1 builds the Worker alongside the client and has `vite preview` run it in workerd, so the
 * production build serves `/api/*` locally. Alchemy injects this plugin itself for dev and deploy,
 * configured from alchemy.run.ts; this mirrors that config, and must change with it.
 */
function previewWorker(): PluginOption {
  return cloudflare({
    main: 'worker/index.ts',
    compatibilityFlags: ['nodejs_compat'],
    worker: {
      name: '000-template-preview',
      bindings: [DurableObjectNamespace.local({ binding: 'Counter', className: 'Counter' })],
      durableObjectNamespaces: [{ className: 'Counter', sql: true }],
      assets: { notFoundHandling: 'single-page-application', runWorkerFirst: ['/api/*'] },
    },
  });
}

/**
 * LAN=1 serves HTTPS (phones only allow orientation, motion and wake lock on secure pages) with a
 * self-signed certificate. Vite serves HTTPS as HTTP/2, which Alchemy's dev proxy (2.0.0-beta.87)
 * can't forward: it copies HTTP/2 pseudo-headers into requests to the Worker and HTTP/1 headers into
 * responses, and Node rejects both. Agreeing only on HTTP/1.1 during the TLS handshake keeps every
 * request HTTP/1.1. The preview server forwards to the Worker the same way, so it gets the same treatment.
 */
const https = { ALPNCallback: () => 'http/1.1' };

export default mergeConfig(
  shared,
  defineConfig({
    plugins: [offline(), lan && basicSsl(), preview && previewWorker()],
    server: lan ? { https } : {},
    preview: lan ? { https, host: '0.0.0.0', port: PORT } : { port: PORT },
  }),
);
