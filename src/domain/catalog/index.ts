/**
 * Built-in exercise catalog aggregation and user-exercise pool builder.
 * Pure domain module with zero DOM or UI dependencies.
 */

import { cloneDefaultExercises } from '../defaults';
import type { Exercise } from '../schema';
import { BAND_EXERCISES, WALL_EXERCISES } from './bandsAndWall';
import { ABS_EXERCISES, EXTRA_UPPER_EXERCISES, LOWER_BODY_EXERCISES } from './dumbbells';
import { BODYWEIGHT_FLOOR_EXERCISES, FOAM_ROLLER_EXERCISES } from './floorAndRoller';
import { MOBILITY_EXERCISES, PILATES_EXERCISES } from './pilatesAndMobility';

export function getExerciseCatalog(): Exercise[] {
  return [
    ...cloneDefaultExercises(),
    ...(structuredClone(EXTRA_UPPER_EXERCISES) as Exercise[]),
    ...(structuredClone(LOWER_BODY_EXERCISES) as Exercise[]),
    ...(structuredClone(ABS_EXERCISES) as Exercise[]),
    ...(structuredClone(BAND_EXERCISES) as Exercise[]),
    ...(structuredClone(WALL_EXERCISES) as Exercise[]),
    ...(structuredClone(BODYWEIGHT_FLOOR_EXERCISES) as Exercise[]),
    ...(structuredClone(FOAM_ROLLER_EXERCISES) as Exercise[]),
    ...(structuredClone(PILATES_EXERCISES) as Exercise[]),
    ...(structuredClone(MOBILITY_EXERCISES) as Exercise[]),
  ];
}

/**
 * Merge built-in catalog with user exercises so custom exercises and custom tag edits
 * participate in tag-driven workout generation without duplicating IDs.
 */
export function buildExercisePool(userExercises: readonly Exercise[] = []): Exercise[] {
  const byId = new Map<string, Exercise>();
  for (const catalogItem of getExerciseCatalog()) {
    byId.set(catalogItem.id, catalogItem);
  }
  for (const userItem of userExercises) {
    byId.set(userItem.id, { ...(structuredClone(userItem) as Exercise), active: true });
  }
  return Array.from(byId.values());
}
