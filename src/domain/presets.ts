/**
 * Thin public entrypoint for the exercise catalog and workout preset generator.
 * Internal modules import directly from `./catalog` and `./generator`.
 */

export { buildExercisePool, getExerciseCatalog } from './catalog';
export {
  generateWorkoutPreset,
  TARGET_MUSCLE_GROUP_OPTIONS,
  type GeneratedWorkoutPreset,
  type GenerateWorkoutOptions,
  type TargetMuscleGroupOption,
} from './generator';
export {
  WORKOUT_DURATIONS,
  WORKOUT_STYLE_LABELS,
  WORKOUT_STYLES,
  type MuscleGroupTag,
  type TargetMuscleGroup,
  type WorkoutDurationMin,
  type WorkoutStyle,
} from './schema';
