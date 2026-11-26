import { describe, expect, it } from 'vitest';
import {
  generateWorkoutPreset,
  TARGET_MUSCLE_GROUP_OPTIONS,
  WORKOUT_DURATIONS,
} from '../src/domain/presets';
import { DEFAULT_SETTINGS, isAnimationId, type Exercise } from '../src/domain/schema';

function createSeededRandom(seed = 42): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe('tag-driven workout preset generator', () => {
  it('generates calibrated workouts within 1 minute of target across all duration x muscle combinations', () => {
    for (const durationMin of WORKOUT_DURATIONS) {
      for (const option of TARGET_MUSCLE_GROUP_OPTIONS) {
        const preset = generateWorkoutPreset({
          durationMin,
          target: option.id,
          currentSettings: {
            ...DEFAULT_SETTINGS,
            soundEnabled: false,
            voiceEnabled: false,
            demoSpeed: 0.65,
          },
          random: createSeededRandom(durationMin + option.id.length),
        });

        expect(preset.routineName).toContain(`${durationMin} min`);
        expect(preset.routineName).toContain(option.label);
        expect(preset.exercises.length).toBeGreaterThanOrEqual(4);
        expect(preset.settings.soundEnabled).toBe(false);
        expect(preset.settings.voiceEnabled).toBe(false);
        expect(preset.settings.demoSpeed).toBe(0.65);

        const targetSec = durationMin * 60;
        expect(Math.abs(preset.estimatedDurationSec - targetSec)).toBeLessThanOrEqual(60);

        for (const ex of preset.exercises) {
          expect(isAnimationId(ex.animationType)).toBe(true);
          expect(ex.durations).toContain(durationMin);
          if (option.id !== 'full') {
            expect(ex.muscleGroups).toContain(option.id);
          }
        }
      }
    }
  });

  it('guarantees upper, lower, and abs coverage for Full Body workouts', () => {
    const preset = generateWorkoutPreset({
      durationMin: 15,
      target: 'full',
      currentSettings: DEFAULT_SETTINGS,
      random: createSeededRandom(7),
    });

    const coveredTags = new Set(preset.exercises.flatMap((ex) => ex.muscleGroups));
    expect(coveredTags.has('upper')).toBe(true);
    expect(coveredTags.has('lower')).toBe(true);
    expect(coveredTags.has('abs')).toBe(true);
  });

  it('varies exercise selection when previousExerciseIds are provided', () => {
    const first = generateWorkoutPreset({
      durationMin: 15,
      target: 'upper',
      currentSettings: DEFAULT_SETTINGS,
      random: createSeededRandom(11),
    });

    const second = generateWorkoutPreset({
      durationMin: 15,
      target: 'upper',
      currentSettings: DEFAULT_SETTINGS,
      previousExerciseIds: first.exercises.map((e) => e.id),
      random: createSeededRandom(12),
    });

    expect(first.matchingPoolSize).toBeGreaterThan(first.exercises.length);
    const firstIds = new Set(first.exercises.map((e) => e.id));
    const freshInSecond = second.exercises.filter((e) => !firstIds.has(e.id));
    // Upper pool has 7+ tagged exercises for 15m, so reshuffling must pull in fresh ones
    expect(freshInSecond.length).toBeGreaterThanOrEqual(3);
  });

  it('includes custom user-created exercises when their duration and muscle tags match', () => {
    const customAbMove: Exercise = {
      id: 'ex-user-hollow-hold',
      name: 'Hollow Body Dumbbell Hold',
      muscleGroup: 'Deep Core',
      muscleGroups: ['abs'],
      durations: [10],
      equipment: { kind: 'dumbbells', weightKg: 5, count: 1, label: '1x 5kg Dumbbell' },
      animationType: 'leg-raise',
      active: true,
      steps: ['Press lower back into floor', 'Lift legs and shoulders', 'Hold steadily'],
      tip: 'Breathe steadily while bracing.',
    };

    const match10 = generateWorkoutPreset({
      durationMin: 10,
      target: 'abs',
      currentSettings: DEFAULT_SETTINGS,
      userExercises: [customAbMove],
      previousExerciseIds: [
        'ex-crunch',
        'ex-russian-twist',
        'ex-leg-raise',
        'ex-plank-tap',
        'ex-glute-bridge',
      ],
      random: createSeededRandom(1),
    });
    expect(match10.exercises.some((e) => e.id === 'ex-user-hollow-hold')).toBe(true);

    const noMatch20 = generateWorkoutPreset({
      durationMin: 20,
      target: 'abs',
      currentSettings: DEFAULT_SETTINGS,
      userExercises: [customAbMove],
      random: createSeededRandom(1),
    });
    expect(noMatch20.exercises.some((e) => e.id === 'ex-user-hollow-hold')).toBe(false);
  });
});
