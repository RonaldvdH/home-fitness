/**
 * Screen Wake Lock controller to keep mobile/tablet displays awake during active workouts.
 * Gracefully degrades to a no-op on browsers without Wake Lock support.
 */

export interface WakeLockController {
  acquire: () => Promise<void>;
  release: () => Promise<void>;
  handleVisibilityChange: (isWorkoutRunning: boolean) => void;
  isSupported: () => boolean;
}

function isWakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
}

export function createWakeLockController(): WakeLockController {
  let sentinel: WakeLockSentinel | null = null;

  async function acquire(): Promise<void> {
    if (!isWakeLockSupported() || sentinel !== null) return;
    try {
      sentinel = await navigator.wakeLock.request('screen');
      sentinel.addEventListener('release', () => {
        sentinel = null;
      });
    } catch {
      sentinel = null;
    }
  }

  async function release(): Promise<void> {
    if (!sentinel) return;
    const current = sentinel;
    sentinel = null;
    try {
      await current.release();
    } catch {
      // Ignore release errors when browser already released the lock.
    }
  }

  function handleVisibilityChange(isWorkoutRunning: boolean): void {
    if (typeof document === 'undefined') return;
    if (document.visibilityState === 'visible' && isWorkoutRunning) {
      void acquire();
    }
  }

  return {
    acquire,
    release,
    handleVisibilityChange,
    isSupported: isWakeLockSupported,
  };
}
