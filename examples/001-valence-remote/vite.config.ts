import shared from '@playtest-kit/config/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig, mergeConfig } from 'vite';

const lan = process.env.LAN === '1';

/**
 * LAN=1 serves HTTPS (phones only allow orientation on secure pages) with a self-signed certificate.
 * Vite serves HTTPS as HTTP/2, which Alchemy's dev proxy (2.0.0-beta.87) can't forward: it copies
 * HTTP/2 pseudo-headers into requests to the Worker and HTTP/1 headers into responses, and Node
 * rejects both. Agreeing only on HTTP/1.1 during the TLS handshake keeps every request HTTP/1.1.
 */
export default mergeConfig(
  shared,
  defineConfig({
    plugins: lan ? [basicSsl()] : [],
    server: lan ? { https: { ALPNCallback: () => 'http/1.1' } } : {},
  }),
);
