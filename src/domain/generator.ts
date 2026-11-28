/**
 * Tag-driven workout circuit generator with Space equipment filtering,
 * dumbbell weight substitution, and shuffle variation.
 * Pure domain module with zero DOM or UI dependencies.
 */

import { buildExercisePool } from './catalog';
import {
  applySpaceToExercise,
  isExerciseEligibleForSpace,
  WORKOUT_STYLE_LABELS,
  type Exercise,
  type MuscleGroupTag,
  type TargetMuscleGroup,
  type WorkoutDurationMin,
  type WorkoutSettings,
  type WorkoutSpace,
  type WorkoutStyle,
} from './schema';
import { buildCircuitTimeline, computeTotalDuration } from './timeline';

export interface TargetMuscleGroupOption {
  id: TargetMuscleGroup;
  label: string;
  subtitle: string;
}

export const TARGET_MUSCLE_GROUP_OPTIONS: readonly TargetMuscleGroupOption[] = [
  {
    id: 'upper',
    label: 'Upper Body',
    subtitle: 'Shoulders • Back • Chest • Arms',
  },
  {
    id: 'lower',
    label: 'Lower Body',
    subtitle: 'Quads • Glutes • Hamstrings',
  },
  {
    id: 'abs',
    label: 'Abs & Core',
    subtitle: 'Upper/Lower Abs • Obliques • Stability',
  },
  {
    id: 'full',
    label: 'Full Body',
    subtitle: 'Legs • Push • Pull • Core',
  },
];

function shuffleArray<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = tmp;
  }
  return copy;
}

/**
 * Pick `count` varied exercises, prioritizing ones not used in `previousIds` first.
 */
function pickWithVariation(
  candidates: readonly Exercise[],
  count: number,
  previousIds: ReadonlySet<string>,
  random: () => number,
): Exercise[] {
  const fresh = shuffleArray(
    candidates.filter((ex) => !previousIds.has(ex.id)),
    random,
  );
  const repeated = shuffleArray(
    candidates.filter((ex) => previousIds.has(ex.id)),
    random,
  );
  return [...fresh, ...repeated].slice(0, count);
}

function selectFullBodyExercises(
  durationCandidates: readonly Exercise[],
  count: number,
  previousIds: ReadonlySet<string>,
  random: () => number,
): Exercise[] {
  const chosen: Exercise[] = [];
  const chosenIds = new Set<string>();

  const pickOneForTag = (tag: MuscleGroupTag): void => {
    const pool = durationCandidates.filter(
      (ex) => !chosenIds.has(ex.id) && ex.muscleGroups.includes(tag),
    );
    const picked = pickWithVariation(pool, 1, previousIds, random)[0];
    if (picked) {
      chosen.push(picked);
      chosenIds.add(picked.id);
    }
  };

  // Guarantee balanced Full Body coverage: at least one lower, upper, and abs move.
  pickOneForTag('lower');
  pickOneForTag('upper');
  pickOneForTag('abs');

  // Fill remaining slots with varied picks across all muscle groups.
  const remainingPool = durationCandidates.filter((ex) => !chosenIds.has(ex.id));
  const extras = pickWithVariation(
    remainingPool,
    Math.max(0, count - chosen.length),
    previousIds,
    random,
  );
  return [...chosen, ...extras];
}

function computeStyleTiming(
  style: WorkoutStyle,
  durationMin: WorkoutDurationMin,
  selectedCount: number,
): Pick<WorkoutSettings, 'workSec' | 'restSec' | 'rounds'> & { demoSpeed?: number } {
  if (style === 'pilates') {
    if (durationMin === 10) return { workSec: 45, restSec: 15, rounds: 2, demoSpeed: 0.7 };
    if (durationMin === 15) {
      return selectedCount >= 5
        ? { workSec: 45, restSec: 10, rounds: 3, demoSpeed: 0.7 }
        : { workSec: 50, restSec: 15, rounds: 3, demoSpeed: 0.7 };
    }
    return selectedCount >= 6
      ? { workSec: 45, restSec: 10, rounds: 3, demoSpeed: 0.7 }
      : { workSec: 50, restSec: 10, rounds: 4, demoSpeed: 0.7 };
  }

  if (style === 'mobility') {
    if (durationMin === 10) return { workSec: 45, restSec: 10, rounds: 2, demoSpeed: 0.65 };
    if (durationMin === 15) return { workSec: 50, restSec: 10, rounds: 3, demoSpeed: 0.65 };
    return { workSec: 60, restSec: 10, rounds: 3, demoSpeed: 0.65 };
  }

  if (durationMin === 10) return { workSec: 35, restSec: 20, rounds: 2 };
  if (durationMin === 15) {
    return selectedCount >= 5
      ? { workSec: 35, restSec: 15, rounds: 3 }
      : { workSec: 40, restSec: 20, rounds: 3 };
  }
  return selectedCount >= 6
    ? { workSec: 40, restSec: 15, rounds: 3 }
    : selectedCount === 5
      ? { workSec: 35, restSec: 15, rounds: 4 }
      : { workSec: 45, restSec: 20, rounds: 4 };
}

export interface GenerateWorkoutOptions {
  durationMin: WorkoutDurationMin;
  target: TargetMuscleGroup;
  style?: WorkoutStyle;
  currentSettings: WorkoutSettings;
  space?: WorkoutSpace;
  userExercises?: readonly Exercise[];
  previousExerciseIds?: readonly string[];
  random?: () => number;
}

export interface GeneratedWorkoutPreset {
  routineName: string;
  durationMin: WorkoutDurationMin;
  target: TargetMuscleGroup;
  style: WorkoutStyle;
  spaceId?: string;
  spaceName?: string;
  exercises: Exercise[];
  settings: WorkoutSettings;
  estimatedDurationSec: number;
  matchingPoolSize: number;
}

export function generateWorkoutPreset(options: GenerateWorkoutOptions): GeneratedWorkoutPreset {
  const {
    durationMin,
    target,
    style = 'strength',
    currentSettings,
    space,
    userExercises = [],
    previousExerciseIds = [],
    random = Math.random,
  } = options;

  const fullPool = buildExercisePool(userExercises);
  const spacePool = space
    ? fullPool.filter((ex) => isExerciseEligibleForSpace(ex, space))
    : fullPool;
  const stylePool = spacePool.filter((ex) => ex.styles.includes(style));

  const durationTagged = stylePool.filter((ex) => ex.durations.includes(durationMin));
  const durationPool = durationTagged.length >= 4 ? durationTagged : stylePool;

  const previousSet = new Set(previousExerciseIds);
  const targetMeta =
    TARGET_MUSCLE_GROUP_OPTIONS.find((opt) => opt.id === target) ?? TARGET_MUSCLE_GROUP_OPTIONS[0]!;

  const desiredCount =
    target === 'full'
      ? durationMin === 10
        ? 4
        : durationMin === 15
          ? 5
          : 6
      : durationMin === 20
        ? 5
        : 4;

  let matchingPool: Exercise[];
  let rawSelected: Exercise[];

  if (target === 'full') {
    matchingPool = durationPool;
    rawSelected = selectFullBodyExercises(durationPool, desiredCount, previousSet, random);
  } else {
    matchingPool = durationPool.filter((ex) => ex.muscleGroups.includes(target));
    const fallbackPool =
      matchingPool.length > 0
        ? matchingPool
        : stylePool.filter((ex) => ex.muscleGroups.includes(target));
    rawSelected = pickWithVariation(fallbackPool, desiredCount, previousSet, random);
  }

  const selected = space
    ? rawSelected.map((ex) => applySpaceToExercise(ex, space))
    : (structuredClone(rawSelected) as Exercise[]);

  const timing = computeStyleTiming(style, durationMin, selected.length);

  const settings: WorkoutSettings = {
    ...currentSettings,
    ...timing,
    includeWarmup: true,
    includeCooldown: true,
  };

  const estimatedDurationSec =
    selected.length > 0 ? computeTotalDuration(buildCircuitTimeline(selected, settings)) : 0;

  const routineName =
    style === 'strength'
      ? `${durationMin} min • ${targetMeta.label}`
      : `${durationMin} min • ${WORKOUT_STYLE_LABELS[style]} • ${targetMeta.label}`;

  return {
    routineName,
    durationMin,
    target,
    style,
    ...(space ? { spaceId: space.id, spaceName: space.name } : {}),
    exercises: selected,
    settings,
    estimatedDurationSec,
    matchingPoolSize: matchingPool.length,
  };
}
