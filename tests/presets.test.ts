import { describe, expect, it } from 'vitest';
import {
  generateWorkoutPreset,
  TARGET_MUSCLE_GROUP_OPTIONS,
  WORKOUT_DURATIONS,
} from '../src/domain/presets';
import { DEFAULT_SETTINGS, isAnimationId } from '../src/domain/schema';

describe('workout preset generator', () => {
  it('generates calibrated workouts within 1 minute of target duration across all combinations', () => {
    for (const durationMin of WORKOUT_DURATIONS) {
      for (const option of TARGET_MUSCLE_GROUP_OPTIONS) {
        const preset = generateWorkoutPreset(durationMin, option.id, {
          ...DEFAULT_SETTINGS,
          soundEnabled: false,
          voiceEnabled: false,
          demoSpeed: 0.65,
        });

        expect(preset.routineName).toContain(`${durationMin} min`);
        expect(preset.routineName).toContain(option.label);
        expect(preset.exercises.length).toBeGreaterThanOrEqual(4);
        expect(preset.settings.soundEnabled).toBe(false);
        expect(preset.settings.voiceEnabled).toBe(false);
        expect(preset.settings.demoSpeed).toBe(0.65);

        // Total duration including warm-up & cool-down should be close to target duration
        const targetSec = durationMin * 60;
        expect(Math.abs(preset.estimatedDurationSec - targetSec)).toBeLessThanOrEqual(60);

        for (const ex of preset.exercises) {
          expect(isAnimationId(ex.animationType)).toBe(true);
          expect(ex.steps.length).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });

  it('produces distinct exercise lineups for upper, lower, abs, and full body', () => {
    const upper = generateWorkoutPreset(15, 'upper', DEFAULT_SETTINGS);
    const lower = generateWorkoutPreset(15, 'lower', DEFAULT_SETTINGS);
    const abs = generateWorkoutPreset(15, 'abs', DEFAULT_SETTINGS);
    const full = generateWorkoutPreset(15, 'full', DEFAULT_SETTINGS);

    expect(upper.exercises.map((e) => e.animationType)).toContain('bicep-curl');
    expect(lower.exercises.map((e) => e.animationType)).toEqual([
      'squat',
      'rdl',
      'reverse-lunge',
      'glute-bridge',
    ]);
    expect(abs.exercises.map((e) => e.animationType)).toEqual([
      'crunch',
      'russian-twist',
      'leg-raise',
      'plank-tap',
    ]);
    expect(full.exercises.length).toBe(5);
  });
});
