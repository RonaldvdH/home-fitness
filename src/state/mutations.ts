/**
 * Pure routine, exercise, space, and session-record mutation helpers for workoutStore.
 */

import {
  normalizeDurationTags,
  normalizeEquipment,
  normalizeMuscleGroupTags,
  normalizeRequiredEquipment,
  normalizeWorkoutSpace,
  normalizeWorkoutStyles,
} from '../domain/migrations';
import type {
  AnimationId,
  AppDataV4,
  EquipmentSpec,
  EquipmentTag,
  Exercise,
  MuscleGroupTag,
  Routine,
  SessionRecord,
  SessionSource,
  WorkoutDurationMin,
  WorkoutSettings,
  WorkoutSpace,
  WorkoutStyle,
} from '../domain/schema';

export interface ExerciseFormInput {
  id?: string;
  name: string;
  muscleGroup: string;
  muscleGroups?: MuscleGroupTag[];
  durations?: WorkoutDurationMin[];
  requiredEquipment?: EquipmentTag[];
  styles?: WorkoutStyle[];
  equipment?: EquipmentSpec | string;
  animationType: AnimationId;
  steps: string[];
  tip: string;
}

export interface SpaceFormInput {
  id?: string;
  name: string;
  availableEquipment: EquipmentTag[];
  dumbbellWeightKg: number;
}

export type IdGenerator = (prefix: string) => string;

export function getActiveRoutine(data: AppDataV4): Routine {
  return data.routines.find((r) => r.id === data.activeRoutineId) ?? data.routines[0]!;
}

export function getActiveSpace(data: AppDataV4): WorkoutSpace {
  return data.spaces.find((s) => s.id === data.activeSpaceId) ?? data.spaces[0]!;
}

export function didTimingSettingsChange(
  current: WorkoutSettings,
  next: Partial<WorkoutSettings>,
): boolean {
  return (
    (next.workSec !== undefined && next.workSec !== current.workSec) ||
    (next.restSec !== undefined && next.restSec !== current.restSec) ||
    (next.rounds !== undefined && next.rounds !== current.rounds) ||
    (next.includeWarmup !== undefined && next.includeWarmup !== current.includeWarmup) ||
    (next.includeCooldown !== undefined && next.includeCooldown !== current.includeCooldown)
  );
}

export function buildSavedExercise(
  input: ExerciseFormInput,
  existing: Exercise | undefined,
  createId: IdGenerator,
): Exercise | null {
  const trimmedName = input.name.trim();
  const trimmedMuscles = input.muscleGroup.trim();
  if (!trimmedName || !trimmedMuscles) return null;

  const cleanedSteps = input.steps.map((step) => step.trim()).filter((step) => step.length > 0);
  const steps =
    cleanedSteps.length > 0
      ? cleanedSteps
      : ['Perform the movement smoothly with controlled breathing.'];
  const tip = input.tip.trim() || 'Maintain steady breathing and smooth control.';

  const equipment = input.equipment
    ? normalizeEquipment(input.equipment)
    : existing
      ? existing.equipment
      : normalizeEquipment('2x 5kg Dumbbells');

  const muscleGroups = normalizeMuscleGroupTags(
    input.muscleGroups ?? existing?.muscleGroups,
    input.animationType,
    trimmedMuscles,
  );
  const durations = normalizeDurationTags(input.durations ?? existing?.durations);
  const requiredEquipment = normalizeRequiredEquipment(
    input.requiredEquipment ?? existing?.requiredEquipment,
    equipment,
    input.animationType,
  );
  const styles = normalizeWorkoutStyles(
    input.styles ?? existing?.styles,
    equipment,
    input.animationType,
    trimmedMuscles,
  );

  return {
    id: existing ? existing.id : createId('ex'),
    name: trimmedName,
    muscleGroup: trimmedMuscles,
    muscleGroups,
    durations,
    requiredEquipment,
    styles,
    equipment,
    animationType: input.animationType,
    active: existing ? existing.active : true,
    steps,
    tip,
    ...(existing?.workSecOverride !== undefined
      ? { workSecOverride: existing.workSecOverride }
      : {}),
  };
}

export function reorderExercises(
  exercises: readonly Exercise[],
  index: number,
  delta: -1 | 1,
): Exercise[] | null {
  const target = index + delta;
  if (target < 0 || target >= exercises.length) return null;
  const next = [...exercises];
  const currentItem = next[index]!;
  next[index] = next[target]!;
  next[target] = currentItem;
  return next;
}

export function upsertSpaceInData(
  data: AppDataV4,
  input: SpaceFormInput,
  createId: IdGenerator,
): { nextData: AppDataV4; space: WorkoutSpace; isUpdate: boolean } | null {
  const existing = input.id ? data.spaces.find((s) => s.id === input.id) : undefined;
  const normalized = normalizeWorkoutSpace(
    {
      id: existing ? existing.id : createId('space'),
      name: input.name,
      availableEquipment: input.availableEquipment,
      dumbbellWeightKg: input.dumbbellWeightKg,
    },
    data.spaces.length,
  );
  if (!normalized) return null;

  const spaces = existing
    ? data.spaces.map((s) => (s.id === existing.id ? normalized : s))
    : [...data.spaces, normalized];

  return {
    nextData: {
      ...data,
      spaces,
      activeSpaceId: normalized.id,
    },
    space: normalized,
    isUpdate: Boolean(existing),
  };
}

export function removeSpaceFromData(
  data: AppDataV4,
  spaceId: string,
): { nextData: AppDataV4; removed: WorkoutSpace } | null {
  if (data.spaces.length <= 1) return null;
  const target = data.spaces.find((s) => s.id === spaceId);
  if (!target) return null;

  const spaces = data.spaces.filter((s) => s.id !== spaceId);
  const nextActiveId = data.activeSpaceId === spaceId ? spaces[0]!.id : data.activeSpaceId;

  return {
    nextData: {
      ...data,
      spaces,
      activeSpaceId: nextActiveId,
    },
    removed: target,
  };
}

export function toggleExerciseActiveInList(
  exercises: readonly Exercise[],
  exerciseId: string,
): { exercises: Exercise[]; target: Exercise; nextActive: boolean } | null {
  const target = exercises.find((e) => e.id === exerciseId);
  if (!target) return null;
  const nextActive = !target.active;
  return {
    exercises: exercises.map((item) =>
      item.id === exerciseId ? { ...item, active: nextActive } : item,
    ),
    target,
    nextActive,
  };
}

export function createSessionRecord(
  routine: Routine,
  totalDurationSec: number,
  source: SessionSource,
  nowMs: number,
  createId: IdGenerator,
): SessionRecord {
  return {
    id: createId('sess'),
    routineId: routine.id,
    routineName: routine.name,
    completedAt: new Date(nowMs).toISOString(),
    durationSec: Math.max(60, totalDurationSec),
    rounds: routine.settings.rounds,
    exerciseCount: routine.exercises.filter((e) => e.active).length,
    source,
  };
}
