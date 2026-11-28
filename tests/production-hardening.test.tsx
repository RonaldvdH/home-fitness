import { fireEvent, render, waitFor } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/components/App';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { createDefaultAppData } from '../src/domain/defaults';
import { createAudioCoach } from '../src/services/audio';
import { MAX_BACKUP_FILE_BYTES, readBackupFile } from '../src/services/backup';
import { createPwaUpdateController } from '../src/services/pwa';
import { createWorkoutStore } from '../src/state/workoutStore';

function ThrowingChild({ message = 'Boom!' }: { message?: string }): never {
  throw new Error(message);
}

describe('production hardening', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ErrorBoundary renders custom fallback and notifies onError when a child throws', () => {
    const onError = vi.fn();
    const { getByTestId } = render(
      <ErrorBoundary
        fallback={<div data-testid="custom-fallback">2D Fallback</div>}
        onError={onError}
      >
        <ThrowingChild message="WebGL failed" />
      </ErrorBoundary>,
    );

    expect(getByTestId('custom-fallback').textContent).toBe('2D Fallback');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]?.[0]?.message).toBe('WebGL failed');
  });

  it('ErrorBoundary root recovery UI requires two-step confirmation before resetting data', () => {
    const { getByTestId, getByRole } = render(
      <ErrorBoundary>
        <ThrowingChild message="Fatal crash" />
      </ErrorBoundary>,
    );

    expect(getByTestId('root-error-boundary').textContent).toContain('Fatal crash');
    expect(getByRole('button', { name: 'Reload App' })).toBeTruthy();
    expect(getByRole('button', { name: 'Download Backup JSON' })).toBeTruthy();

    const resetBtn = getByRole('button', { name: 'Reset Local Data' });
    fireEvent.click(resetBtn);
    expect(getByRole('button', { name: 'Confirm Reset Local Data & Reload' })).toBeTruthy();
  });

  it('workoutStore surfaces a single persistent warning toast when storage.save fails', () => {
    const failingStorage = {
      load: () => createDefaultAppData(),
      save: vi.fn(() => false),
    };
    const store = createWorkoutStore({ storage: failingStorage });

    store.toggleSound();
    store.toggleSound();

    const errorToasts = store
      .getState()
      .toasts.filter((t) => t.variant === 'error' && t.message.includes('browser storage'));
    expect(errorToasts).toHaveLength(1);
    expect(errorToasts[0]?.persistent).toBe(true);

    store.destroy();
  });

  it('readBackupFile rejects files exceeding MAX_BACKUP_FILE_BYTES', async () => {
    const oversized = {
      size: MAX_BACKUP_FILE_BYTES + 1,
    } as unknown as File;

    const result = await readBackupFile(oversized);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('2 MB');
    }
  });

  it('AudioCoach.dispose closes an open AudioContext cleanly', () => {
    const closeSpy = vi.fn().mockResolvedValue(undefined);
    const originalAudioCtx = window.AudioContext;

    class MockAudioContext {
      state = 'running';
      currentTime = 0;
      destination = {};
      createOscillator() {
        return {
          type: 'sine',
          frequency: { setValueAtTime: vi.fn() },
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
      }
      createGain() {
        return {
          gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
          connect: vi.fn(),
        };
      }
      resume = vi.fn().mockResolvedValue(undefined);
      close = closeSpy;
    }

    window.AudioContext = MockAudioContext as unknown as typeof AudioContext;
    try {
      const coach = createAudioCoach(true);
      coach.unlock();
      coach.dispose();
      expect(closeSpy).toHaveBeenCalledTimes(1);
    } finally {
      window.AudioContext = originalAudioCtx;
    }
  });

  it('defers the PWA update toast while a workout is running and shows it once paused', async () => {
    let triggerNeedRefresh: (() => void) | undefined;
    const applyUpdateSpy = vi.fn().mockResolvedValue(undefined);
    const pwa = createPwaUpdateController({
      register: (opts) => {
        triggerNeedRefresh = opts?.onNeedRefresh;
        return applyUpdateSpy;
      },
    });

    const store = createWorkoutStore({
      storage: { load: () => createDefaultAppData(), save: () => true },
    });

    const { queryByText, getByRole } = render(<App store={store} pwa={pwa} />);

    // Start workout first, then signal an update is ready
    store.start();
    triggerNeedRefresh?.();

    // Toast must stay suppressed while actively running
    expect(queryByText('Update available')).toBeNull();

    // Pause workout -> subtle Refresh toast should appear
    store.pause();

    await waitFor(() => {
      expect(queryByText('Update available')).toBeTruthy();
    });

    const refreshBtn = getByRole('button', { name: 'Refresh' });
    fireEvent.click(refreshBtn);
    expect(applyUpdateSpy).toHaveBeenCalledWith(true);

    store.destroy();
    pwa.destroy();
  });
});
