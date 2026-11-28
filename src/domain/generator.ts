/**
 * Tag-driven workout circuit generator with Space equipment filtering,
 * dumbbell weight substitution, and shuffle variation.
 * Pure domain module with zero DOM or UI dependencies.
 */

import { buildExercisePool } from './catalog';
import {
  applySpaceToExercise,
  isExerciseEligibleForSpace,
  type Exercise,
  type MuscleGroupTag,
  type TargetMuscleGroup,
  type WorkoutDurationMin,
  type WorkoutSettings,
  type WorkoutSpace,
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

export interface GenerateWorkoutOptions {
  durationMin: WorkoutDurationMin;
  target: TargetMuscleGroup;
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

  const durationTagged = spacePool.filter((ex) => ex.durations.includes(durationMin));
  const durationPool = durationTagged.length >= 4 ? durationTagged : spacePool;

  const previousSet = new Set(previousExerciseIds);
  const targetMeta =
    TARGET_MUSCLE_GROUP_OPTIONS.find((opt) => opt.id === target) ?? TARGET_MUSCLE_GROUP_OPTIONS[0]!;

  // Desired exercise counts & calibrated intervals (including 2 min warm-up + 1 min cool-down):
  // - 10 min: 4 exercises x 2 rounds (35s/20s) = 10:00
  // - 15 min: 4 exercises x 3 rounds (40s/20s) = 14:40 | full-body 5 exercises x 3 rounds (35s/15s) = 15:15
  // - 20 min: 5 exercises x 4 rounds (35s/15s) = 19:25 | full-body 6 exercises x 3 rounds (40s/15s) = 19:15
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
        : spacePool.filter((ex) => ex.muscleGroups.includes(target));
    rawSelected = pickWithVariation(fallbackPool, desiredCount, previousSet, random);
  }

  const selected = space
    ? rawSelected.map((ex) => applySpaceToExercise(ex, space))
    : (structuredClone(rawSelected) as Exercise[]);

  let timing: Pick<WorkoutSettings, 'workSec' | 'restSec' | 'rounds'>;
  if (durationMin === 10) {
    timing = { workSec: 35, restSec: 20, rounds: 2 };
  } else if (durationMin === 15) {
    timing =
      selected.length >= 5
        ? { workSec: 35, restSec: 15, rounds: 3 }
        : { workSec: 40, restSec: 20, rounds: 3 };
  } else {
    timing =
      selected.length >= 6
        ? { workSec: 40, restSec: 15, rounds: 3 }
        : selected.length === 5
          ? { workSec: 35, restSec: 15, rounds: 4 }
          : { workSec: 45, restSec: 20, rounds: 4 };
  }

  const settings: WorkoutSettings = {
    ...currentSettings,
    ...timing,
    includeWarmup: true,
    includeCooldown: true,
  };

  const estimatedDurationSec =
    selected.length > 0 ? computeTotalDuration(buildCircuitTimeline(selected, settings)) : 0;

  return {
    routineName: `${durationMin} min • ${targetMeta.label}`,
    durationMin,
    target,
    ...(space ? { spaceId: space.id, spaceName: space.name } : {}),
    exercises: selected,
    settings,
    estimatedDurationSec,
    matchingPoolSize: matchingPool.length,
  };
}
