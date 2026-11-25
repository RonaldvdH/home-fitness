/**
 * Drift-free wall-clock interval timer controller.
 * Pure TypeScript with injectable clock/timers so sleep/drift and edge cases can be unit-tested.
 */

import type { TimelineStep } from '../domain/schema';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface TimerSnapshot {
  status: TimerStatus;
  currentIndex: number;
  remainingMs: number;
  remainingSec: number;
}

export interface TimerClock {
  now: () => number;
  setInterval: (fn: () => void, ms: number) => ReturnType<typeof setInterval>;
  clearInterval: (id: ReturnType<typeof setInterval>) => void;
}

export interface TimerCallbacks {
  onChange: (snapshot: TimerSnapshot) => void;
  onCountdown?: (secRemaining: number, step: TimelineStep) => void;
  onStepStart?: (step: TimelineStep, index: number, autoTriggered: boolean) => void;
  onComplete?: () => void;
}

const DEFAULT_CLOCK: TimerClock = {
  now: () => Date.now(),
  setInterval: (fn, ms) => globalThis.setInterval(fn, ms),
  clearInterval: (id) => globalThis.clearInterval(id),
};

const TICK_INTERVAL_MS = 200;

export interface WorkoutTimerController {
  getSnapshot: () => TimerSnapshot;
  setTimeline: (
    timeline: readonly TimelineStep[],
    options?: { preserveProgress?: boolean },
  ) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  jumpToStep: (index: number) => void;
  sync: () => void;
  destroy: () => void;
}

export function createWorkoutTimer(
  initialTimeline: readonly TimelineStep[],
  callbacks: TimerCallbacks,
  clock: TimerClock = DEFAULT_CLOCK,
): WorkoutTimerController {
  let timeline: readonly TimelineStep[] = initialTimeline;
  let status: TimerStatus = 'idle';
  let currentIndex = 0;
  let remainingMs = (timeline[0]?.duration ?? 0) * 1000;
  let stepEndsAtMs: number | null = null;
  let lastCountdownSec: number | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  function getSnapshot(): TimerSnapshot {
    return {
      status,
      currentIndex,
      remainingMs: Math.max(0, remainingMs),
      remainingSec: Math.max(0, Math.ceil(remainingMs / 1000)),
    };
  }

  function emitChange(): void {
    callbacks.onChange(getSnapshot());
  }

  function clearTicker(): void {
    if (intervalId !== null) {
      clock.clearInterval(intervalId);
      intervalId = null;
    }
  }

  function finishWorkout(): void {
    clearTicker();
    stepEndsAtMs = null;
    lastCountdownSec = null;
    status = 'completed';
    remainingMs = 0;
    currentIndex = Math.max(0, timeline.length - 1);
    emitChange();
    callbacks.onComplete?.();
  }

  function sync(): void {
    if (status !== 'running' || stepEndsAtMs === null) return;

    const now = clock.now();
    let deltaRemaining = stepEndsAtMs - now;

    if (deltaRemaining > 0) {
      remainingMs = deltaRemaining;
      const sec = Math.ceil(remainingMs / 1000);
      if (sec <= 3 && sec >= 1 && sec !== lastCountdownSec) {
        lastCountdownSec = sec;
        const step = timeline[currentIndex];
        if (step) callbacks.onCountdown?.(sec, step);
      }
      emitChange();
      return;
    }

    // One or more steps elapsed (e.g., backgrounded mobile browser woke up late).
    let overdueMs = -deltaRemaining;
    let nextIdx = currentIndex + 1;

    while (nextIdx < timeline.length) {
      const nextStep = timeline[nextIdx]!;
      const nextDurationMs = Math.max(1, nextStep.duration) * 1000;
      if (overdueMs < nextDurationMs) {
        currentIndex = nextIdx;
        remainingMs = nextDurationMs - overdueMs;
        stepEndsAtMs = now + remainingMs;
        lastCountdownSec = null;
        emitChange();
        callbacks.onStepStart?.(nextStep, nextIdx, true);
        return;
      }
      overdueMs -= nextDurationMs;
      nextIdx += 1;
    }

    finishWorkout();
  }

  function start(): void {
    if (status === 'running' || timeline.length === 0) return;

    // Starting after completion restarts cleanly from step 0 without double-logging.
    if (status === 'completed') {
      currentIndex = 0;
      remainingMs = (timeline[0]?.duration ?? 0) * 1000;
    }

    const currentStep = timeline[currentIndex];
    if (!currentStep) return;

    const isFreshStepStart = remainingMs >= currentStep.duration * 1000;
    status = 'running';
    stepEndsAtMs = clock.now() + remainingMs;
    lastCountdownSec = null;

    clearTicker();
    intervalId = clock.setInterval(sync, TICK_INTERVAL_MS);

    emitChange();
    if (isFreshStepStart) {
      callbacks.onStepStart?.(currentStep, currentIndex, false);
    }
  }

  function pause(): void {
    if (status !== 'running') return;
    if (stepEndsAtMs !== null) {
      remainingMs = Math.max(0, stepEndsAtMs - clock.now());
    }
    clearTicker();
    stepEndsAtMs = null;
    status = 'paused';
    emitChange();
  }

  function reset(): void {
    clearTicker();
    stepEndsAtMs = null;
    lastCountdownSec = null;
    status = 'idle';
    currentIndex = 0;
    remainingMs = (timeline[0]?.duration ?? 0) * 1000;
    emitChange();
  }

  function jumpToStep(index: number): void {
    if (timeline.length === 0) return;
    const clamped = Math.min(timeline.length - 1, Math.max(0, index));
    const targetStep = timeline[clamped]!;
    const wasRunning = status === 'running';

    currentIndex = clamped;
    remainingMs = targetStep.duration * 1000;
    lastCountdownSec = null;

    if (wasRunning) {
      stepEndsAtMs = clock.now() + remainingMs;
      emitChange();
      callbacks.onStepStart?.(targetStep, clamped, false);
    } else {
      status = clamped === 0 ? 'idle' : 'paused';
      stepEndsAtMs = null;
      emitChange();
    }
  }

  function stepForward(): void {
    if (timeline.length === 0) return;
    // Manual skip never fabricates a completed workout session; clamp at final step.
    if (currentIndex >= timeline.length - 1) {
      return;
    }
    jumpToStep(currentIndex + 1);
  }

  function stepBackward(): void {
    if (timeline.length === 0) return;
    if (currentIndex <= 0) {
      jumpToStep(0);
      return;
    }
    jumpToStep(currentIndex - 1);
  }

  function setTimeline(
    nextTimeline: readonly TimelineStep[],
    options?: { preserveProgress?: boolean },
  ): void {
    timeline = nextTimeline;
    if (options?.preserveProgress && timeline.length > 0 && status !== 'idle') {
      const clampedIdx = Math.min(currentIndex, timeline.length - 1);
      const step = timeline[clampedIdx]!;
      currentIndex = clampedIdx;
      remainingMs = Math.min(remainingMs, step.duration * 1000);
      if (status === 'running') {
        stepEndsAtMs = clock.now() + remainingMs;
      }
      emitChange();
      return;
    }
    reset();
  }

  function destroy(): void {
    clearTicker();
    stepEndsAtMs = null;
  }

  return {
    getSnapshot,
    setTimeline,
    start,
    pause,
    reset,
    stepForward,
    stepBackward,
    jumpToStep,
    sync,
    destroy,
  };
}
