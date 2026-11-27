import { describe, expect, it, vi } from 'vitest';
import {
  computeFloorModeSnapshot,
  createFoldableController,
  FLEX_POSTURE_MEDIA_QUERY,
  type MediaQueryListLike,
} from '../src/services/foldable';

function createMockMatchMedia(initialMatches = false) {
  let matches = initialMatches;
  const listeners = new Set<(event: { matches: boolean }) => void>();
  let queriedWith = '';

  const mql: MediaQueryListLike = {
    get matches() {
      return matches;
    },
    addEventListener: (_type, listener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type, listener) => {
      listeners.delete(listener);
    },
  };

  return {
    matchMedia: (query: string) => {
      queriedWith = query;
      return mql;
    },
    setMatches: (next: boolean) => {
      matches = next;
      for (const listener of listeners) {
        listener({ matches: next });
      }
    },
    getListenerCount: () => listeners.size,
    getQueriedWith: () => queriedWith,
  };
}

describe('foldable Flex / Floor Mode detection & manual override', () => {
  it('computes Floor Mode activation truth table accurately', () => {
    expect(computeFloorModeSnapshot(false, 'auto')).toEqual({
      isAutoFolded: false,
      override: 'auto',
      active: false,
      activation: 'inactive',
    });
    expect(computeFloorModeSnapshot(true, 'auto')).toEqual({
      isAutoFolded: true,
      override: 'auto',
      active: true,
      activation: 'auto',
    });
    expect(computeFloorModeSnapshot(false, 'on')).toEqual({
      isAutoFolded: false,
      override: 'on',
      active: true,
      activation: 'manual',
    });
    expect(computeFloorModeSnapshot(true, 'off')).toEqual({
      isAutoFolded: true,
      override: 'off',
      active: false,
      activation: 'inactive',
    });
  });

  it('auto-detects vertical-viewport-segments: 2 and responds to fold/unfold hardware events', () => {
    const mock = createMockMatchMedia(false);
    const controller = createFoldableController({ matchMedia: mock.matchMedia });
    const onChange = vi.fn();
    const unsub = controller.subscribe(onChange);

    expect(mock.getQueriedWith()).toBe(FLEX_POSTURE_MEDIA_QUERY);
    expect(controller.getSnapshot().active).toBe(false);

    // User folds Galaxy Z Flip to 90 degrees -> auto activates Floor Mode
    mock.setMatches(true);
    expect(controller.getSnapshot()).toEqual({
      isAutoFolded: true,
      override: 'auto',
      active: true,
      activation: 'auto',
    });
    expect(onChange).toHaveBeenCalledTimes(1);

    // User manually dismisses Floor Mode while still folded
    controller.exitFloorMode();
    expect(controller.getSnapshot()).toEqual({
      isAutoFolded: true,
      override: 'off',
      active: false,
      activation: 'inactive',
    });

    // User unfolds phone -> re-arms auto-detection for next time
    mock.setMatches(false);
    expect(controller.getSnapshot()).toEqual({
      isAutoFolded: false,
      override: 'auto',
      active: false,
      activation: 'inactive',
    });

    // Folding again auto-activates smoothly
    mock.setMatches(true);
    expect(controller.getSnapshot().active).toBe(true);
    expect(controller.getSnapshot().activation).toBe('auto');

    unsub();
    controller.destroy();
    expect(mock.getListenerCount()).toBe(0);
  });

  it('supports manual 1-tap toggle on browsers without Viewport Segments API', () => {
    const controller = createFoldableController({ matchMedia: null });
    expect(controller.getSnapshot().active).toBe(false);

    controller.toggleFloorMode();
    expect(controller.getSnapshot()).toEqual({
      isAutoFolded: false,
      override: 'on',
      active: true,
      activation: 'manual',
    });

    controller.toggleFloorMode();
    expect(controller.getSnapshot()).toEqual({
      isAutoFolded: false,
      override: 'auto',
      active: false,
      activation: 'inactive',
    });

    controller.enterFloorMode();
    expect(controller.getSnapshot().active).toBe(true);
    controller.exitFloorMode();
    expect(controller.getSnapshot().active).toBe(false);

    controller.destroy();
  });

  it('supports legacy addListener/removeListener and recovers if matchMedia throws', () => {
    const legacyListeners = new Set<(event: { matches: boolean }) => void>();
    const legacyController = createFoldableController({
      matchMedia: () => ({
        matches: true,
        addListener: (fn) => legacyListeners.add(fn),
        removeListener: (fn) => legacyListeners.delete(fn),
      }),
    });

    expect(legacyController.getSnapshot().active).toBe(true);
    expect(legacyController.getSnapshot().activation).toBe('auto');
    expect(legacyListeners.size).toBe(1);

    legacyController.destroy();
    expect(legacyListeners.size).toBe(0);

    const throwingController = createFoldableController({
      matchMedia: () => {
        throw new Error('Unsupported media query');
      },
    });
    expect(throwingController.getSnapshot().active).toBe(false);
    throwingController.toggleFloorMode();
    expect(throwingController.getSnapshot().active).toBe(true);
    throwingController.destroy();
  });
});
