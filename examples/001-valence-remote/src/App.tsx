import { lazy, Suspense } from 'react';

const ROOM = 'demo';

// `/` is the viewer, at `/demo`, as in 002; `/remote` was the phone's page before `/participate`, so
// old QR codes and bookmarks still work. Rewritten before the first render, so the address bar says
// where you are, with the remote's settings (`?detection=` and the rest) kept.
const { pathname, search, hash } = window.location;
if (pathname === '/') {
  window.history.replaceState(null, '', `/demo${search}${hash}`);
} else if (pathname.startsWith('/remote')) {
  window.history.replaceState(null, '', `/participate${search}${hash}`);
}

// Each page is its own chunk, so phones on `/participate` don't download the viewer and vice versa.
const Remote = lazy(() => import('./pages/Remote.tsx').then((m) => ({ default: m.Remote })));
const Viewer = lazy(() => import('./pages/Viewer.tsx').then((m) => ({ default: m.Viewer })));

/** The same spinner `index.html` shows before React starts (styled there), so loading looks continuous. */
function PageLoading() {
  return <div aria-label="Loading" className="page-loading" role="status" />;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoading />}>
      {window.location.pathname.startsWith('/participate') ? <Remote room={ROOM} /> : <Viewer room={ROOM} />}
    </Suspense>
  );
}
