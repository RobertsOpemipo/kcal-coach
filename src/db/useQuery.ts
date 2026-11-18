import { useEffect, useMemo, useState } from 'react';
import { subscribe } from './changes';

/**
 * Re-runs `read` on mount, when `key` changes, and after any database write.
 * Reads are synchronous. `key` should be a string or number built from whatever `read` depends on.
 */
export function useQuery<T>(read: () => T, key: string | number = ''): T {
  const [version, setVersion] = useState(0);
  useEffect(() => subscribe(() => setVersion((v) => v + 1)), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => read(), [version, key]);
}
