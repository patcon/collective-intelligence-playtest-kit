import { useEffect } from 'react';

/** Calls `resource.dispose()` when the component unmounts (or `resource` changes). */
export function useDisposeOnUnmount(resource: { dispose: () => void }): void {
  useEffect(() => () => resource.dispose(), [resource]);
}
