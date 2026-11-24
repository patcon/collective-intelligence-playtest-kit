import shared from '@playtest-kit/config/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig, mergeConfig } from 'vite';

const lan = process.env.LAN === '1';

// With HTTPS, Vite serves HTTP/2 unless `server.proxy` is set, and Alchemy's dev proxy
// (2.0.0-beta.87) forwards HTTP/2 pseudo-headers such as `:method`, which fails every request.
// An empty proxy keeps Vite on HTTP/1.1 over TLS.
export default mergeConfig(
  shared,
  defineConfig({
    plugins: lan ? [basicSsl()] : [],
    server: lan ? { proxy: {} } : {},
  }),
);
