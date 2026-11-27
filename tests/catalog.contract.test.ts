/**
 * Exercise catalog & tag contract tests.
 * Ensures every built-in exercise and (Space x Duration x Muscle Group) combination satisfies data quality invariants.
 */

import { describe, expect, it } from 'vitest';
import {
  COOLDOWN_ITEM,
  DEFAULT_EXERCISES,
  DEFAULT_SPACES,
  WARMUP_ITEM,
} from '../src/domain/defaults';
import {
  generateWorkoutPreset,
  getExerciseCatalog,
  TARGET_MUSCLE_GROUP_OPTIONS,
} from '../src/domain/presets';
import {
  DEFAULT_SETTINGS,
  EQUIPMENT_TAGS,
  isAnimationId,
  isExerciseEligibleForSpace,
  MUSCLE_GROUP_TAGS,
  WORKOUT_DURATIONS,
  WORKOUT_STYLES,
  type Exercise,
} from '../src/domain/schema';

const VALID_MUSCLE_TAGS: ReadonlySet<string> = new Set(MUSCLE_GROUP_TAGS);
const VALID_DURATIONS: ReadonlySet<number> = new Set(WORKOUT_DURATIONS);
const VALID_EQUIPMENT_TAGS: ReadonlySet<string> = new Set(EQUIPMENT_TAGS);
const VALID_STYLES: ReadonlySet<string> = new Set(WORKOUT_STYLES);

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

  expect(new Set(exercise.requiredEquipment).size).toBe(exercise.requiredEquipment.length);
  for (const eq of exercise.requiredEquipment) {
    expect(VALID_EQUIPMENT_TAGS.has(eq)).toBe(true);
  }

  expect(exercise.styles.length).toBeGreaterThan(0);
  expect(new Set(exercise.styles).size).toBe(exercise.styles.length);
  for (const style of exercise.styles) {
    expect(VALID_STYLES.has(style)).toBe(true);
  }

  expect(exercise.equipment.label.trim().length).toBeGreaterThan(0);
  if (exercise.equipment.kind === 'dumbbells') {
    expect(exercise.equipment.weightKg).toBeGreaterThan(0);
    expect(exercise.requiredEquipment).toContain('dumbbells');
  }

  expect(exercise.steps.length).toBeGreaterThanOrEqual(3);
  for (const step of exercise.steps) {
    expect(step.trim().length).toBeGreaterThan(10);
  }
  expect(exercise.tip.trim().length).toBeGreaterThan(10);
}

describe('catalog & tag contracts', () => {
  it('validates every exercise in the expanded catalog, defaults, warm-up, and cool-down', () => {
    const catalog = getExerciseCatalog();
    expect(catalog.length).toBeGreaterThanOrEqual(30);

    const ids = new Set<string>();
    const coveredEquipment = new Set<string>();
    for (const ex of catalog) {
      expect(ids.has(ex.id)).toBe(false);
      ids.add(ex.id);
      assertValidExerciseContract(ex);
      for (const eq of ex.requiredEquipment) coveredEquipment.add(eq);
    }

    // Confirm Phase 3 equipment categories are represented
    expect(coveredEquipment.has('dumbbells')).toBe(true);
    expect(coveredEquipment.has('bands')).toBe(true);
    expect(coveredEquipment.has('wall')).toBe(true);
    expect(coveredEquipment.has('floor')).toBe(true);
    expect(coveredEquipment.has('foam-roller')).toBe(true);
    expect(catalog.some((ex) => ex.requiredEquipment.length === 0)).toBe(true);

    for (const ex of DEFAULT_EXERCISES) {
      expect(ids.has(ex.id)).toBe(true);
      assertValidExerciseContract(ex);
    }

    assertValidExerciseContract(WARMUP_ITEM);
    assertValidExerciseContract(COOLDOWN_ITEM);
  });

  it('guarantees every (default Space x duration x target muscle group) combination has valid equipment-matched exercises', () => {
    for (const space of DEFAULT_SPACES) {
      for (const durationMin of WORKOUT_DURATIONS) {
        for (const option of TARGET_MUSCLE_GROUP_OPTIONS) {
          const preset = generateWorkoutPreset({
            durationMin,
            target: option.id,
            currentSettings: DEFAULT_SETTINGS,
            space,
            random: () => 0.5,
          });

          expect(preset.exercises.length).toBeGreaterThanOrEqual(4);
          expect(preset.matchingPoolSize).toBeGreaterThanOrEqual(preset.exercises.length);
          expect(Math.abs(preset.estimatedDurationSec - durationMin * 60)).toBeLessThanOrEqual(60);

          for (const ex of preset.exercises) {
            expect(isExerciseEligibleForSpace(ex, space)).toBe(true);
          }
        }
      }
    }
  });
});
