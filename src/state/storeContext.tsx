/**
 * Zero-dependency Preact Context + selector hook for render isolation.
 * Components subscribe only to their derived slice so 1 Hz timer ticks
 * do not trigger full-tree re-renders.
 */

import { createContext, type ComponentChildren } from 'preact';
import { useContext, useEffect, useRef, useState } from 'preact/hooks';
import type { WorkoutStore, WorkoutStoreState } from './workoutStore';

export const WorkoutStoreContext = createContext<WorkoutStore | null>(null);

export function WorkoutStoreProvider({
  store,
  children,
}: {
  store: WorkoutStore;
  children: ComponentChildren;
}) {
  return <WorkoutStoreContext.Provider value={store}>{children}</WorkoutStoreContext.Provider>;
}

export function useWorkoutStore(): WorkoutStore {
  const store = useContext(WorkoutStoreContext);
  if (!store) {
    throw new Error('useWorkoutStore must be used inside <WorkoutStoreProvider>');
  }
  return store;
}

export function shallowEqual<T extends Record<string, unknown>>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.is(a[key], b[key])) return false;
  }
  return true;
}

export function useStoreSelector<T>(
  selector: (state: WorkoutStoreState) => T,
  isEqual: (prev: T, next: T) => boolean = Object.is,
): T {
  const store = useWorkoutStore();
  const selectorRef = useRef(selector);
  const isEqualRef = useRef(isEqual);
  selectorRef.current = selector;
  isEqualRef.current = isEqual;

  const [selected, setSelected] = useState<T>(() => selector(store.getState()));
  const selectedRef = useRef<T>(selected);
  selectedRef.current = selected;

  useEffect(() => {
    const sync = (): void => {
      const next = selectorRef.current(store.getState());
      if (!isEqualRef.current(selectedRef.current, next)) {
        selectedRef.current = next;
        setSelected(next);
      }
    };
    sync();
    return store.subscribe(sync);
  }, [store]);

  return selected;
}
