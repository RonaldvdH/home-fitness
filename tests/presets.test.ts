import { describe, expect, it } from 'vitest';
import { DEFAULT_SPACES } from '../src/domain/defaults';
import {
  generateWorkoutPreset,
  TARGET_MUSCLE_GROUP_OPTIONS,
  WORKOUT_DURATIONS,
} from '../src/domain/presets';
import {
  DEFAULT_SETTINGS,
  isAnimationId,
  isExerciseEligibleForSpace,
  type Exercise,
  type WorkoutSpace,
} from '../src/domain/schema';

function createSeededRandom(seed = 42): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe('tag-driven & space-aware workout preset generator', () => {
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

  it('strictly enforces Space equipment subsets across every (Default Space x Duration x Muscle Group)', () => {
    for (const space of DEFAULT_SPACES) {
      for (const durationMin of WORKOUT_DURATIONS) {
        for (const option of TARGET_MUSCLE_GROUP_OPTIONS) {
          const preset = generateWorkoutPreset({
            durationMin,
            target: option.id,
            currentSettings: DEFAULT_SETTINGS,
            space,
            random: createSeededRandom(durationMin + space.name.length + option.id.length),
          });

          expect(preset.spaceId).toBe(space.id);
          expect(preset.exercises.length).toBeGreaterThanOrEqual(4);

          for (const ex of preset.exercises) {
            expect(isExerciseEligibleForSpace(ex, space)).toBe(true);
            if (!space.availableEquipment.includes('dumbbells')) {
              expect(ex.equipment.kind).not.toBe('dumbbells');
              expect(ex.requiredEquipment).not.toContain('dumbbells');
            }
          }
        }
      }
    }
  });

  it('substitutes the active Space dumbbellWeightKg into generated dumbbell exercises', () => {
    const heavyHomeGym: WorkoutSpace = {
      id: 'space-heavy',
      name: 'Heavy Home Gym',
      availableEquipment: ['dumbbells'],
      dumbbellWeightKg: 7.5,
    };

    const preset = generateWorkoutPreset({
      durationMin: 15,
      target: 'upper',
      currentSettings: DEFAULT_SETTINGS,
      space: heavyHomeGym,
      random: createSeededRandom(3),
    });

    expect(preset.exercises.length).toBeGreaterThanOrEqual(4);
    for (const ex of preset.exercises) {
      expect(ex.equipment.kind).toBe('dumbbells');
      expect(ex.equipment.weightKg).toBe(7.5);
      expect(ex.equipment.label).toContain('7.5kg');
    }
  });

  it('handles sparse or empty equipment combinations gracefully without leaking unavailable gear', () => {
    const standingOnlySpace: WorkoutSpace = {
      id: 'space-standing-only',
      name: 'Hallway',
      availableEquipment: [],
      dumbbellWeightKg: 5,
    };

    // Upper body currently requires dumbbells/bands/wall/floor, so standing-only must return 0 matches cleanly
    const upperEmpty = generateWorkoutPreset({
      durationMin: 10,
      target: 'upper',
      currentSettings: DEFAULT_SETTINGS,
      space: standingOnlySpace,
      random: createSeededRandom(5),
    });
    expect(upperEmpty.exercises).toEqual([]);
    expect(upperEmpty.matchingPoolSize).toBe(0);
    expect(upperEmpty.estimatedDurationSec).toBe(0);

    // Lower body still has standing bodyweight squats & lunges
    const lowerStanding = generateWorkoutPreset({
      durationMin: 10,
      target: 'lower',
      currentSettings: DEFAULT_SETTINGS,
      space: standingOnlySpace,
      random: createSeededRandom(5),
    });
    expect(lowerStanding.exercises.length).toBeGreaterThanOrEqual(2);
    for (const ex of lowerStanding.exercises) {
      expect(ex.requiredEquipment).toEqual([]);
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
    expect(freshInSecond.length).toBeGreaterThanOrEqual(3);
  });

  it('includes custom user-created exercises when their Space, duration, and muscle tags match', () => {
    const customAbMove: Exercise = {
      id: 'ex-user-hollow-hold',
      name: 'Hollow Body Dumbbell Hold',
      muscleGroup: 'Deep Core',
      muscleGroups: ['abs'],
      durations: [10],
      requiredEquipment: ['dumbbells', 'floor'],
      styles: ['strength'],
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
      space: DEFAULT_SPACES[0], // Home Gym has dumbbells + floor
      userExercises: [customAbMove],
      previousExerciseIds: [
        'ex-crunch',
        'ex-russian-twist',
        'ex-leg-raise',
        'ex-plank-tap',
        'ex-glute-bridge',
        'ex-bird-dog',
        'ex-dead-bug',
        'ex-superman',
        'ex-bw-glute-bridge',
        'ex-roller-dead-bug',
      ],
      random: createSeededRandom(1),
    });
    expect(match10.exercises.some((e) => e.id === 'ex-user-hollow-hold')).toBe(true);

    // Travel Space has no dumbbells -> custom dumbbell move must NOT appear
    const excludedInTravel = generateWorkoutPreset({
      durationMin: 10,
      target: 'abs',
      currentSettings: DEFAULT_SETTINGS,
      space: DEFAULT_SPACES[2], // Travel
      userExercises: [customAbMove],
      random: createSeededRandom(1),
    });
    expect(excludedInTravel.exercises.some((e) => e.id === 'ex-user-hollow-hold')).toBe(false);

    const noMatch20 = generateWorkoutPreset({
      durationMin: 20,
      target: 'abs',
      currentSettings: DEFAULT_SETTINGS,
      userExercises: [customAbMove],
      random: createSeededRandom(1),
    });
    expect(noMatch20.exercises.some((e) => e.id === 'ex-user-hollow-hold')).toBe(false);
  });

  it('builds valid Pilates and Mobility circuits across all default Spaces with slower breath cadence', () => {
    const styles = ['strength', 'pilates', 'mobility'] as const;
    for (const style of styles) {
      for (const space of DEFAULT_SPACES) {
        for (const durationMin of WORKOUT_DURATIONS) {
          const preset = generateWorkoutPreset({
            durationMin,
            target: 'full',
            style,
            currentSettings: DEFAULT_SETTINGS,
            space,
            random: createSeededRandom(31),
          });

          expect(preset.style).toBe(style);
          expect(
            preset.exercises.length,
            `${style} / ${space.name} / ${durationMin}m should have matches`,
          ).toBeGreaterThan(0);

          for (const ex of preset.exercises) {
            expect(ex.styles).toContain(style);
            for (const req of ex.requiredEquipment) {
              expect(space.availableEquipment).toContain(req);
            }
          }

          if (style === 'pilates') {
            expect(preset.settings.demoSpeed).toBe(0.7);
            expect(preset.routineName).toContain('Pilates');
          } else if (style === 'mobility') {
            expect(preset.settings.demoSpeed).toBe(0.65);
            expect(preset.routineName).toContain('Mobility');
          }
        }
      }
    }
  });
});
