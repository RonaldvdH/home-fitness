import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_EXERCISES } from '../src/domain/defaults';
import type { TimelineStep } from '../src/domain/schema';
import { createWorkoutTimer, type TimerClock } from '../src/engine/timer';

function createFakeClock(startMs = 1000) {
  let nowMs = startMs;
  let tickFn: (() => void) | null = null;
  let nextId = 1;

  const clock: TimerClock = {
    now: () => nowMs,
    setInterval: (fn) => {
      tickFn = fn;
      return nextId++ as unknown as ReturnType<typeof setInterval>;
    },
    clearInterval: () => {
      tickFn = null;
    },
  };

  return {
    clock,
    advance(ms: number) {
      nowMs += ms;
      tickFn?.();
    },
  };
}

const SAMPLE_TIMELINE: TimelineStep[] = [
  { phase: 'WORK', duration: 10, round: 1, totalRounds: 1, exercise: DEFAULT_EXERCISES[0]! },
  { phase: 'REST', duration: 5, round: 1, totalRounds: 1, exercise: DEFAULT_EXERCISES[1]! },
  { phase: 'WORK', duration: 10, round: 1, totalRounds: 1, exercise: DEFAULT_EXERCISES[1]! },
];

describe('wall-clock workout timer', () => {
  it('tracks countdown cues (3, 2, 1) without duplicate beeps and advances across steps', () => {
    const fake = createFakeClock();
    const countdowns: number[] = [];
    const startedIndices: number[] = [];
    const onComplete = vi.fn();

    const timer = createWorkoutTimer(
      SAMPLE_TIMELINE,
      {
        onChange: () => {},
        onCountdown: (sec) => countdowns.push(sec),
        onStepStart: (_step, idx) => startedIndices.push(idx),
        onComplete,
      },
      fake.clock,
    );

    timer.start();
    expect(startedIndices).toEqual([0]);

    // Step through second 7 -> 3 -> 2 -> 1
    fake.advance(7200); // remaining ~2.8s => ceil = 3
    fake.advance(400); // still 2.4s => ceil = 3 (must not double fire)
    fake.advance(800); // remaining 1.6s => ceil = 2
    fake.advance(1000); // remaining 0.6s => ceil = 1
    expect(countdowns).toEqual([3, 2, 1]);

    // Cross into step 1 (REST)
    fake.advance(700);
    expect(timer.getSnapshot().currentIndex).toBe(1);
    expect(startedIndices).toEqual([0, 1]);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('recovers accurately from background tab sleep spanning multiple steps', () => {
    const fake = createFakeClock();
    const onComplete = vi.fn();

    const timer = createWorkoutTimer(
      SAMPLE_TIMELINE,
      { onChange: () => {}, onComplete },
      fake.clock,
    );

    timer.start();
    // Sleep 17s: passes 10s WORK + 5s REST, lands 2s into step 2 (8s remaining)
    fake.advance(17_000);

    const snap = timer.getSnapshot();
    expect(snap.status).toBe('running');
    expect(snap.currentIndex).toBe(2);
    expect(snap.remainingSec).toBe(8);
    expect(onComplete).not.toHaveBeenCalled();

    // Finish final 8s
    fake.advance(8000);
    expect(timer.getSnapshot().status).toBe('completed');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does not log duplicate completion when restarting after finished, nor on manual skip', () => {
    const fake = createFakeClock();
    const onComplete = vi.fn();

    const timer = createWorkoutTimer(
      SAMPLE_TIMELINE,
      { onChange: () => {}, onComplete },
      fake.clock,
    );

    // Manual stepping to last step never fabricates completion
    timer.stepForward();
    timer.stepForward();
    timer.stepForward();
    expect(timer.getSnapshot().currentIndex).toBe(2);
    expect(timer.getSnapshot().status).toBe('paused');
    expect(onComplete).not.toHaveBeenCalled();

    // Let final step finish naturally
    timer.start();
    fake.advance(10_000);
    expect(timer.getSnapshot().status).toBe('completed');
    expect(onComplete).toHaveBeenCalledTimes(1);

    // Clicking start after completion restarts cleanly from step 0
    timer.start();
    expect(timer.getSnapshot().status).toBe('running');
    expect(timer.getSnapshot().currentIndex).toBe(0);
    expect(timer.getSnapshot().remainingSec).toBe(10);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('preserves remaining time accurately across pause and resume', () => {
    const fake = createFakeClock();
    const timer = createWorkoutTimer(SAMPLE_TIMELINE, { onChange: () => {} }, fake.clock);

    timer.start();
    fake.advance(3500);
    timer.pause();

    expect(timer.getSnapshot().status).toBe('paused');
    expect(timer.getSnapshot().remainingMs).toBe(6500);

    // Time passes while paused — must not drain remainingMs
    fake.advance(30_000);
    expect(timer.getSnapshot().remainingMs).toBe(6500);

    timer.start();
    fake.advance(2500);
    expect(timer.getSnapshot().remainingMs).toBe(4000);
  });
});
