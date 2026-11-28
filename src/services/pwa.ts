/**
 * Prompt-based PWA Service Worker update controller.
 * Surfaces update availability cleanly without auto-reloading mid-workout,
 * and supports manual update checks and safe app-shell reloads from Settings.
 */

export interface PwaUpdateSnapshot {
  updateAvailable: boolean;
}

export type UpdateCheckResult = 'update-found' | 'up-to-date' | 'unsupported';

export interface PwaUpdateController {
  getSnapshot: () => PwaUpdateSnapshot;
  subscribe: (listener: () => void) => () => void;
  applyUpdate: () => Promise<void>;
  checkForUpdate: () => Promise<UpdateCheckResult>;
  forceReload: () => Promise<void>;
  dismiss: () => void;
  destroy: () => void;
}

type RegisterSWFn = (options?: {
  immediate?: boolean;
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegisteredSW?: (swUrl: string, registration: ServiceWorkerRegistration | undefined) => void;
}) => (reloadPage?: boolean) => Promise<void>;

export interface PwaUpdateDependencies {
  register?: RegisterSWFn;
}

export function createPwaUpdateController(deps: PwaUpdateDependencies = {}): PwaUpdateController {
  let snapshot: PwaUpdateSnapshot = { updateAvailable: false };
  let triggerUpdate: ((reloadPage?: boolean) => Promise<void>) | null = null;
  let swRegistration: ServiceWorkerRegistration | undefined;
  let destroyed = false;
  const listeners = new Set<() => void>();

  function setAvailable(next: boolean): void {
    if (destroyed || snapshot.updateAvailable === next) return;
    snapshot = { updateAvailable: next };
    listeners.forEach((listener) => listener());
  }

  const registerOptions = {
    immediate: true,
    onNeedRefresh: () => setAvailable(true),
    onRegisteredSW: (_url: string, reg: ServiceWorkerRegistration | undefined) => {
      swRegistration = reg;
    },
  };

  if (deps.register) {
    triggerUpdate = deps.register(registerOptions);
  } else if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    void import('virtual:pwa-register')
      .then(({ registerSW }) => {
        if (destroyed) return;
        triggerUpdate = registerSW(registerOptions);
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
    async checkForUpdate(): Promise<UpdateCheckResult> {
      if (snapshot.updateAvailable) return 'update-found';
      if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
        return 'unsupported';
      }
      try {
        const reg = swRegistration ?? (await navigator.serviceWorker.getRegistration());
        if (!reg) return 'unsupported';
        swRegistration = reg;
        await reg.update();
        if (reg.waiting || reg.installing) {
          setAvailable(true);
          return 'update-found';
        }
        return 'up-to-date';
      } catch {
        return 'unsupported';
      }
    },
    async forceReload(): Promise<void> {
      if (snapshot.updateAvailable && triggerUpdate) {
        setAvailable(false);
        await triggerUpdate(true);
        return;
      }
      try {
        if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        }
        if (typeof caches !== 'undefined') {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
      } catch {
        // Proceed with standard reload even if cache/SW cleanup is restricted.
      }
      if (typeof window !== 'undefined') {
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
