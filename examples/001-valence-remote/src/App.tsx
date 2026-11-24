import { lazy, Suspense } from 'react';

const ROOM = 'demo';

// Each page is its own chunk, so phones on `/remote` don't download the viewer and vice versa.
const Remote = lazy(() => import('./pages/Remote.tsx').then((m) => ({ default: m.Remote })));
const Viewer = lazy(() => import('./pages/Viewer.tsx').then((m) => ({ default: m.Viewer })));

export default function App() {
  return (
    <Suspense fallback={null}>
      {window.location.pathname.startsWith('/remote') ? <Remote room={ROOM} /> : <Viewer room={ROOM} />}
    </Suspense>
  );
}
