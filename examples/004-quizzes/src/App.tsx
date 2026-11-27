import { lazy, Suspense } from 'react';

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

/** The page for this path: a phone's, or else the demo page. */
function Page() {
  return window.location.pathname.startsWith('/participate') ? <Participate /> : <Demo />;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Page />
    </Suspense>
  );
}
