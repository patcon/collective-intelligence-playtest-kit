import { lazy, Suspense } from 'react';

const ROOM = 'demo';

// Each page is its own chunk, so phones on `/remote` don't download the viewer and vice versa.
const Remote = lazy(() => import('./pages/Remote.tsx').then((m) => ({ default: m.Remote })));
const Viewer = lazy(() => import('./pages/Viewer.tsx').then((m) => ({ default: m.Viewer })));

/** The same spinner `index.html` shows before React starts (styled there), so loading looks continuous. */
function PageLoading() {
  return <div aria-label="Loading" className="page-loading" role="status" />;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoading />}>
      {window.location.pathname.startsWith('/remote') ? <Remote room={ROOM} /> : <Viewer room={ROOM} />}
    </Suspense>
  );
}
