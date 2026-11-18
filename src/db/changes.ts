/** Tiny change notifier so screens re-read after any write. No dependencies. */
type Listener = () => void;
const listeners = new Set<Listener>();

export const subscribe = (fn: Listener): (() => void) => {
  listeners.add(fn);
  return () => void listeners.delete(fn);
};
export const notifyChange = (): void => listeners.forEach((fn) => fn());
