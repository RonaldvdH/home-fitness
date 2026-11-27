/**
 * Foldable tabletop / Flex Mode detection & manual Floor Mode override service (ADR-0003).
 *
 * Supports dual activation:
 * 1. Automatic hardware detection via `@media (vertical-viewport-segments: 2)` when exposed by the browser.
 * 2. Manual 1-tap Floor Mode toggle for Android browsers / WebViews (e.g., Ecosia) that do not expose
 *    the CSS Viewport Segments API.
 */

export const FLEX_POSTURE_MEDIA_QUERY = '(vertical-viewport-segments: 2)';

export type FloorModeOverride = 'auto' | 'on' | 'off';
export type FloorModeActivation = 'inactive' | 'auto' | 'manual';

export interface FloorModeSnapshot {
  isAutoFolded: boolean;
  override: FloorModeOverride;
  active: boolean;
  activation: FloorModeActivation;
}

export interface MediaQueryListLike {
  readonly matches: boolean;
  addEventListener?: (type: 'change', listener: (event: { matches: boolean }) => void) => void;
  removeEventListener?: (type: 'change', listener: (event: { matches: boolean }) => void) => void;
  addListener?: (listener: (event: { matches: boolean }) => void) => void;
  removeListener?: (listener: (event: { matches: boolean }) => void) => void;
}

export type MatchMediaFn = (query: string) => MediaQueryListLike;

export interface FoldableController {
  getSnapshot: () => FloorModeSnapshot;
  subscribe: (listener: () => void) => () => void;
  enterFloorMode: () => void;
  exitFloorMode: () => void;
  toggleFloorMode: () => void;
  destroy: () => void;
}

export function computeFloorModeSnapshot(
  isAutoFolded: boolean,
  override: FloorModeOverride,
): FloorModeSnapshot {
  if (override === 'on') {
    return { isAutoFolded, override, active: true, activation: 'manual' };
  }
  if (override === 'off') {
    return { isAutoFolded, override, active: false, activation: 'inactive' };
  }
  return isAutoFolded
    ? { isAutoFolded, override, active: true, activation: 'auto' }
    : { isAutoFolded, override, active: false, activation: 'inactive' };
}

function getDefaultMatchMedia(): MatchMediaFn | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null;
  }
  return (query: string) => window.matchMedia(query);
}

export function createFoldableController(options?: {
  matchMedia?: MatchMediaFn | null;
}): FoldableController {
  const matchMediaFn =
    options && 'matchMedia' in options ? (options.matchMedia ?? null) : getDefaultMatchMedia();

  let mql: MediaQueryListLike | null = null;
  let isAutoFolded = false;
  let override: FloorModeOverride = 'auto';

  if (matchMediaFn) {
    try {
      mql = matchMediaFn(FLEX_POSTURE_MEDIA_QUERY);
      isAutoFolded = Boolean(mql.matches);
    } catch {
      mql = null;
      isAutoFolded = false;
    }
  }

  let snapshot = computeFloorModeSnapshot(isAutoFolded, override);
  const listeners = new Set<() => void>();

  const emit = (): void => {
    const next = computeFloorModeSnapshot(isAutoFolded, override);
    if (
      next.isAutoFolded === snapshot.isAutoFolded &&
      next.override === snapshot.override &&
      next.active === snapshot.active &&
      next.activation === snapshot.activation
    ) {
      return;
    }
    snapshot = next;
    for (const listener of listeners) {
      listener();
    }
  };

  const handleMediaChange = (event: { matches: boolean }): void => {
    const nextFolded = Boolean(event.matches);
    if (!nextFolded && override === 'off') {
      // Phone was unfolded after the user dismissed auto Floor Mode: re-arm auto detection.
      override = 'auto';
    }
    isAutoFolded = nextFolded;
    emit();
  };

  if (mql) {
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handleMediaChange);
    } else if (typeof mql.addListener === 'function') {
      mql.addListener(handleMediaChange);
    }
  }

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    enterFloorMode: () => {
      override = isAutoFolded ? 'auto' : 'on';
      emit();
    },
    exitFloorMode: () => {
      override = isAutoFolded ? 'off' : 'auto';
      emit();
    },
    toggleFloorMode: () => {
      if (snapshot.active) {
        override = isAutoFolded ? 'off' : 'auto';
      } else {
        override = isAutoFolded ? 'auto' : 'on';
      }
      emit();
    },
    destroy: () => {
      if (mql) {
        if (typeof mql.removeEventListener === 'function') {
          mql.removeEventListener('change', handleMediaChange);
        } else if (typeof mql.removeListener === 'function') {
          mql.removeListener(handleMediaChange);
        }
      }
      listeners.clear();
    },
  };
}
