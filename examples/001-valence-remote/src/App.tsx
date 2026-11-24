import { Remote } from './pages/Remote.tsx';
import { Viewer } from './pages/Viewer.tsx';

const ROOM = 'demo';

export default function App() {
  return window.location.pathname.startsWith('/remote') ? <Remote room={ROOM} /> : <Viewer room={ROOM} />;
}
