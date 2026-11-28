/**
 * Prompt-based PWA Service Worker update controller.
 * Surfaces update availability cleanly without auto-reloading mid-workout.
 */

export interface PwaUpdateSnapshot {
  updateAvailable: boolean;
}

export interface PwaUpdateController {
  getSnapshot: () => PwaUpdateSnapshot;
  subscribe: (listener: () => void) => () => void;
  applyUpdate: () => Promise<void>;
  dismiss: () => void;
  destroy: () => void;
}

type RegisterSWFn = (options?: {
  immediate?: boolean;
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
}) => (reloadPage?: boolean) => Promise<void>;

export interface PwaUpdateDependencies {
  register?: RegisterSWFn;
}

export function createPwaUpdateController(deps: PwaUpdateDependencies = {}): PwaUpdateController {
  let snapshot: PwaUpdateSnapshot = { updateAvailable: false };
  let triggerUpdate: ((reloadPage?: boolean) => Promise<void>) | null = null;
  let destroyed = false;
  const listeners = new Set<() => void>();

  function setAvailable(next: boolean): void {
    if (destroyed || snapshot.updateAvailable === next) return;
    snapshot = { updateAvailable: next };
    listeners.forEach((listener) => listener());
  }

  if (deps.register) {
    triggerUpdate = deps.register({
      immediate: true,
      onNeedRefresh: () => setAvailable(true),
    });
  } else if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    void import('virtual:pwa-register')
      .then(({ registerSW }) => {
        if (destroyed) return;
        triggerUpdate = registerSW({
          immediate: true,
          onNeedRefresh: () => setAvailable(true),
        });
      })
      .catch(() => {
        // Service worker registration is unavailable in dev/test environments.
      });
  }

  return {
    getSnapshot() {
      return snapshot;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async applyUpdate() {
      setAvailable(false);
      if (triggerUpdate) {
        await triggerUpdate(true);
      } else if (typeof window !== 'undefined') {
        window.location.reload();
      }
    },
    dismiss() {
      setAvailable(false);
    },
    destroy() {
      destroyed = true;
      listeners.clear();
    },
  };
}
