import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './styles.css';

// A new deploy's service worker installs and waits (offline.ts). Have it take over straight away;
// once it does, registerSW reloads the page onto the new build. A no-op in dev.
const updateServiceWorker = registerSW({ immediate: true, onNeedRefresh: () => void updateServiceWorker(true) });

const root = document.querySelector('#root');
if (!root) {
  throw new Error('Missing #root element');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
