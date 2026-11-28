import { act, cleanup, render } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDefaultAppData } from '../src/domain/defaults';
import type { TimerClock } from '../src/engine/timer';
import { useStoreSelector, WorkoutStoreProvider } from '../src/state/storeContext';
import { createToastQueue } from '../src/state/toastQueue';
import { createWorkoutStore } from '../src/state/workoutStore';

function createFakeClock() {
  let now = 1_700_000_000_000;
  const intervals = new Map<number, { fn: () => void; ms: number }>();
  let nextId = 1;

  const clock: TimerClock = {
    now: () => now,
    setInterval: (fn, ms) => {
      const id = nextId++;
      intervals.set(id, { fn, ms });
      return id as unknown as ReturnType<typeof setInterval>;
    },
    clearInterval: (id) => {
      intervals.delete(id as unknown as number);
    },
  };

  return {
    clock,
    advance(ms: number) {
      now += ms;
      for (const entry of intervals.values()) {
        entry.fn();
      }
    },
  };
}

describe('store decomposition, injectable clock/IDs & selector render isolation', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('prevents sibling components from re-rendering on 1 Hz timer ticks when using useStoreSelector', () => {
    const fakeClock = createFakeClock();
    const store = createWorkoutStore({
      storage: { load: () => createDefaultAppData(), save: () => true },
      clock: fakeClock.clock,
      audio: {
        isEnabled: () => false,
        setEnabled: () => {},
        unlock: () => {},
        beepCountdown: () => {},
        beepWorkStart: () => {},
        beepRestStart: () => {},
        beepComplete: () => {},
        dispose: () => {},
      },
      voice: {
        isSupported: () => false,
        isEnabled: () => false,
        setEnabled: () => {},
        announceStep: () => {},
        announceCountdown: () => {},
        announceComplete: () => {},
        testVoice: () => {},
        cancel: () => {},
      },
      wakeLock: {
        isSupported: () => false,
        acquire: async () => {},
        release: async () => {},
        handleVisibilityChange: () => {},
      },
    });

    let timerRenders = 0;
    let routineRenders = 0;

    function TimerReadout() {
      timerRenders += 1;
      const remainingSec = useStoreSelector((s) => s.timer.remainingSec);
      return <span data-testid="sec">{remainingSec}</span>;
    }

    function RoutineNameReadout() {
      routineRenders += 1;
      const name = useStoreSelector((s) => s.activeRoutine.name);
      return <span data-testid="name">{name}</span>;
    }

    const { getByTestId } = render(
      <WorkoutStoreProvider store={store}>
        <TimerReadout />
        <RoutineNameReadout />
      </WorkoutStoreProvider>,
    );

    const initialSec = Number(getByTestId('sec').textContent);
    expect(timerRenders).toBe(1);
    expect(routineRenders).toBe(1);

    act(() => {
      store.start();
    });
    act(() => {
      fakeClock.advance(1000);
    });
    act(() => {
      fakeClock.advance(1000);
    });
    act(() => {
      fakeClock.advance(1000);
    });

    expect(Number(getByTestId('sec').textContent)).toBe(initialSec - 3);
    expect(timerRenders).toBeGreaterThanOrEqual(4);
    expect(routineRenders).toBe(1);

    store.destroy();
  });

  it('uses injectable now() and createId() for deterministic session and exercise creation', () => {
    let seq = 1;
    const fixedNow = Date.UTC(2026, 10, 28, 12, 0, 0);
    const store = createWorkoutStore({
      storage: { load: () => createDefaultAppData(), save: () => true },
      now: () => fixedNow,
      createId: (prefix) => `${prefix}-det-${seq++}`,
    });

    store.logManualSession();
    const session = store.getState().data.history[0]!;
    expect(session.id).toBe('sess-det-1');
    expect(session.completedAt).toBe('2026-11-28T12:00:00.000Z');

    store.saveExercise({
      name: 'Deterministic Press',
      muscleGroup: 'Shoulders',
      animationType: 'overhead-press',
      steps: ['Press overhead cleanly.'],
      tip: 'Brace core.',
    });
    const added = store.getState().activeRoutine.exercises.at(-1)!;
    expect(added.id).toBe('ex-det-2');

    store.destroy();
  });

  it('auto-dismisses transient toasts and retains persistent toasts in toastQueue', () => {
    vi.useFakeTimers();
    const changes: number[] = [];
    const queue = createToastQueue((items) => changes.push(items.length), 1000);

    queue.push('Transient', 'info');
    queue.push('Persistent', 'error', { persistent: true });
    expect(queue.getToasts()).toHaveLength(2);

    vi.advanceTimersByTime(1000);
    expect(queue.getToasts()).toHaveLength(1);
    expect(queue.getToasts()[0]?.message).toBe('Persistent');

    queue.destroy();
  });
});
