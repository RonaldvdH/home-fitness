/**
 * Exercise catalog & tag contract tests.
 * Ensures every built-in exercise and preset combination satisfies data quality invariants.
 */

import { describe, expect, it } from 'vitest';
import { COOLDOWN_ITEM, DEFAULT_EXERCISES, WARMUP_ITEM } from '../src/domain/defaults';
import {
  generateWorkoutPreset,
  getExerciseCatalog,
  TARGET_MUSCLE_GROUP_OPTIONS,
} from '../src/domain/presets';
import {
  DEFAULT_SETTINGS,
  isAnimationId,
  MUSCLE_GROUP_TAGS,
  WORKOUT_DURATIONS,
  type Exercise,
} from '../src/domain/schema';

const VALID_MUSCLE_TAGS: ReadonlySet<string> = new Set(MUSCLE_GROUP_TAGS);
const VALID_DURATIONS: ReadonlySet<number> = new Set(WORKOUT_DURATIONS);

function assertValidExerciseContract(exercise: Exercise): void {
  expect(exercise.id.trim().length).toBeGreaterThan(0);
  expect(exercise.name.trim().length).toBeGreaterThan(0);
  expect(exercise.muscleGroup.trim().length).toBeGreaterThan(0);
  expect(isAnimationId(exercise.animationType)).toBe(true);

  expect(exercise.muscleGroups.length).toBeGreaterThan(0);
  expect(new Set(exercise.muscleGroups).size).toBe(exercise.muscleGroups.length);
  for (const tag of exercise.muscleGroups) {
    expect(VALID_MUSCLE_TAGS.has(tag)).toBe(true);
  }

  expect(exercise.durations.length).toBeGreaterThan(0);
  expect(new Set(exercise.durations).size).toBe(exercise.durations.length);
  for (const mins of exercise.durations) {
    expect(VALID_DURATIONS.has(mins)).toBe(true);
  }

  expect(exercise.equipment.label.trim().length).toBeGreaterThan(0);
  if (exercise.equipment.kind === 'dumbbells') {
    expect(exercise.equipment.weightKg).toBeGreaterThan(0);
  }

  expect(exercise.steps.length).toBeGreaterThanOrEqual(3);
  for (const step of exercise.steps) {
    expect(step.trim().length).toBeGreaterThan(10);
  }
  expect(exercise.tip.trim().length).toBeGreaterThan(10);
}

describe('catalog & tag contracts', () => {
  it('validates every exercise in the catalog, defaults, warm-up, and cool-down', () => {
    const catalog = getExerciseCatalog();
    expect(catalog.length).toBeGreaterThanOrEqual(15);

    const ids = new Set<string>();
    for (const ex of catalog) {
      expect(ids.has(ex.id)).toBe(false);
      ids.add(ex.id);
      assertValidExerciseContract(ex);
    }

    for (const ex of DEFAULT_EXERCISES) {
      expect(ids.has(ex.id)).toBe(true);
      assertValidExerciseContract(ex);
    }

    assertValidExerciseContract(WARMUP_ITEM);
    assertValidExerciseContract(COOLDOWN_ITEM);
  });

  it('guarantees every (duration x target muscle group) combination has enough matching exercises', () => {
    for (const durationMin of WORKOUT_DURATIONS) {
      for (const option of TARGET_MUSCLE_GROUP_OPTIONS) {
        const preset = generateWorkoutPreset({
          durationMin,
          target: option.id,
          currentSettings: DEFAULT_SETTINGS,
          random: () => 0.5,
        });

        expect(preset.exercises.length).toBeGreaterThanOrEqual(4);
        expect(preset.matchingPoolSize).toBeGreaterThanOrEqual(preset.exercises.length);
        expect(Math.abs(preset.estimatedDurationSec - durationMin * 60)).toBeLessThanOrEqual(60);
      }
    }
  });
});
