import { describe, expect, it } from 'vitest';
import { DEFAULT_EXERCISES } from '../src/domain/defaults';
import { DEFAULT_SETTINGS } from '../src/domain/schema';
import { buildCircuitTimeline, computeTotalDuration, formatMMSS } from '../src/domain/timeline';

describe('formatMMSS', () => {
  it('formats zero and positive seconds with leading zeros', () => {
    expect(formatMMSS(0)).toBe('00:00');
    expect(formatMMSS(5)).toBe('00:05');
    expect(formatMMSS(65)).toBe('01:05');
    expect(formatMMSS(900)).toBe('15:00');
  });

  it('clamps negative values to 00:00', () => {
    expect(formatMMSS(-12)).toBe('00:00');
  });
});

describe('buildCircuitTimeline', () => {
  it('builds warm-up, alternating work/rest rounds, and cool-down', () => {
    const timeline = buildCircuitTimeline(DEFAULT_EXERCISES, {
      ...DEFAULT_SETTINGS,
      workSec: 40,
      restSec: 20,
      rounds: 2,
      includeWarmup: true,
      includeCooldown: true,
    });

    expect(timeline[0]?.phase).toBe('WARM-UP');
    expect(timeline[0]?.duration).toBe(120);
    expect(timeline[0]?.exercise.equipment.kind).toBe('bodyweight');
    expect(timeline[timeline.length - 1]?.phase).toBe('COOL-DOWN');
    expect(timeline[timeline.length - 1]?.duration).toBe(60);

    const workSteps = timeline.filter((s) => s.phase === 'WORK');
    const restSteps = timeline.filter((s) => s.phase === 'REST');
    expect(workSteps).toHaveLength(8);
    expect(restSteps).toHaveLength(7);
  });

  it('honors per-exercise workSecOverride when present', () => {
    const custom = [{ ...DEFAULT_EXERCISES[0]!, workSecOverride: 55 }, DEFAULT_EXERCISES[1]!];

    const timeline = buildCircuitTimeline(custom, {
      ...DEFAULT_SETTINGS,
      workSec: 30,
      restSec: 15,
      rounds: 1,
      includeWarmup: false,
      includeCooldown: false,
    });

    expect(timeline[0]?.duration).toBe(55);
    expect(timeline[1]?.duration).toBe(15);
    expect(timeline[2]?.duration).toBe(30);
    expect(computeTotalDuration(timeline)).toBe(100);
  });

  it('skips inactive exercises and falls back if none are active', () => {
    const inactive = DEFAULT_EXERCISES.map((ex) => ({ ...ex, active: false }));
    const timeline = buildCircuitTimeline(inactive, {
      ...DEFAULT_SETTINGS,
      workSec: 40,
      restSec: 20,
      rounds: 1,
      includeWarmup: false,
      includeCooldown: false,
    });

    expect(timeline).toHaveLength(1);
    expect(timeline[0]?.phase).toBe('WORK');
  });
});
