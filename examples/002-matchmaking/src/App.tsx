import { lazy, Suspense } from 'react';

const ROOM = 'demo';

// `/` is the demo page; rewritten before the first render, so the address bar says where you are.
if (window.location.pathname === '/') {
  window.history.replaceState(null, '', '/demo');
}

// Each page is its own chunk, so phones on `/participate` don't download the demo page and vice versa.
const Demo = lazy(() => import('./pages/Demo.tsx').then((m) => ({ default: m.Demo })));
const Participate = lazy(() => import('./pages/Participate.tsx').then((m) => ({ default: m.Participate })));

/** The same spinner `index.html` shows before React starts (styled there), so loading looks continuous. */
function PageLoading() {
  return <div aria-label="Loading" className="page-loading" role="status" />;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoading />}>
      {window.location.pathname.startsWith('/participate') ? <Participate room={ROOM} /> : <Demo room={ROOM} />}
    </Suspense>
  );
}
