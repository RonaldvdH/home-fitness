/**
 * Tagged exercise catalog and dynamic variation builder for the New Workout overlay.
 * Exercises are filtered by their `durations` and `muscleGroups` tags and shuffled
 * to produce varied circuits while honoring user-created custom exercises.
 */

import { cloneDefaultExercises } from './defaults';
import {
  WORKOUT_DURATIONS,
  type Exercise,
  type MuscleGroupTag,
  type TargetMuscleGroup,
  type WorkoutDurationMin,
  type WorkoutSettings,
} from './schema';
import { buildCircuitTimeline, computeTotalDuration } from './timeline';

export { WORKOUT_DURATIONS, type MuscleGroupTag, type TargetMuscleGroup, type WorkoutDurationMin };

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

const EXTRA_UPPER_EXERCISES: readonly Exercise[] = [
  {
    id: 'ex-lateral-raise',
    name: 'Dumbbell Lateral Raises',
    muscleGroup: 'Side Deltoids • Upper Traps',
    muscleGroups: ['upper'],
    durations: [10, 15, 20],
    equipment: {
      kind: 'dumbbells',
      weightKg: 5,
      count: 2,
      label: '2x 5kg Dumbbells • Standing',
    },
    animationType: 'lateral-raise',
    active: true,
    steps: [
      'Stand tall holding both 5kg dumbbells slightly in front of your thighs with a soft bend in your elbows.',
      'Raise both arms out to your sides in a smooth arc until elbows reach shoulder height.',
      'Lower the dumbbells back down over a controlled 2-second count without letting them swing.',
    ],
    tip: 'Lead slightly with your elbows and keep your shoulders relaxed down away from your ears.',
  },
  {
    id: 'ex-front-raise',
    name: 'Alternating Front Raises',
    muscleGroup: 'Front Deltoids • Upper Chest',
    muscleGroups: ['upper'],
    durations: [15, 20],
    equipment: {
      kind: 'dumbbells',
      weightKg: 5,
      count: 2,
      label: '2x 5kg Dumbbells • Standing',
    },
    animationType: 'front-raise',
    active: true,
    steps: [
      'Stand tall with core braced and hold the 5kg dumbbells in front of your thighs, palms facing you.',
      'Lift smoothly forward to shoulder height with a soft elbow while keeping your torso still.',
      'Lower under control back to your thighs before initiating the next rep.',
    ],
    tip: 'Avoid leaning backward—exhale as you lift to keep your ribs stacked over your hips.',
  },
  {
    id: 'ex-tricep-extension',
    name: 'Overhead Tricep Extensions',
    muscleGroup: 'Triceps • Core Stability',
    muscleGroups: ['upper'],
    durations: [10, 15, 20],
    equipment: {
      kind: 'dumbbells',
      weightKg: 5,
      count: 2,
      label: '2x 5kg Dumbbells • Standing',
    },
    animationType: 'tricep-extension',
    active: true,
    steps: [
      'Press both 5kg dumbbells overhead with upper arms tucked close beside your ears and core braced.',
      'Bend strictly at your elbows to lower the weights smoothly behind your head until you feel a tricep stretch.',
      'Extend your elbows straight back up overhead and squeeze your triceps at lockout.',
    ],
    tip: 'Keep your elbows pointed forward instead of flaring wide to isolate the long head of your triceps.',
  },
];

const LOWER_BODY_EXERCISES: readonly Exercise[] = [
  {
    id: 'ex-squat',
    name: 'Dumbbell Squats',
    muscleGroup: 'Quadriceps • Glutes • Core',
    muscleGroups: ['lower'],
    durations: [10, 15, 20],
    equipment: {
      kind: 'dumbbells',
      weightKg: 5,
      count: 2,
      label: '2x 5kg Dumbbells • Standing',
    },
    animationType: 'squat',
    active: true,
    steps: [
      'Stand with feet shoulder-width apart, toes slightly turned out, holding the 5kg dumbbells at your sides.',
      'Sit your hips back and down until thighs are roughly parallel to the floor while keeping your chest proud.',
      'Drive evenly through your mid-foot and heels to stand tall and squeeze your glutes at the top.',
    ],
    tip: 'Keep your knees tracking in line with your toes and avoid rounding your lower back at the bottom.',
  },
  {
    id: 'ex-rdl',
    name: 'Romanian Deadlifts (RDL)',
    muscleGroup: 'Hamstrings • Glutes • Lower Back',
    muscleGroups: ['lower'],
    durations: [10, 15, 20],
    equipment: {
      kind: 'dumbbells',
      weightKg: 5,
      count: 2,
      label: '2x 5kg Dumbbells • Standing Hinge',
    },
    animationType: 'rdl',
    active: true,
    steps: [
      'Hold the 5kg dumbbells in front of your thighs with knees softly unlocked and spine neutral.',
      'Push your hips straight back as the dumbbells glide close down your shins until you feel a hamstring stretch.',
      'Drive your hips forward smoothly to return upright without arching your lower back.',
    ],
    tip: 'Think about closing a car door behind you with your hips rather than bending down with your back.',
  },
  {
    id: 'ex-reverse-lunge',
    name: 'Dumbbell Reverse Lunges',
    muscleGroup: 'Quads • Glutes • Balance',
    muscleGroups: ['lower'],
    durations: [10, 15, 20],
    equipment: {
      kind: 'dumbbells',
      weightKg: 5,
      count: 2,
      label: '2x 5kg Dumbbells • Standing',
    },
    animationType: 'reverse-lunge',
    active: true,
    steps: [
      'Stand tall holding both 5kg dumbbells at your sides with core braced and shoulders relaxed.',
      'Step one foot straight back and lower both knees toward 90 degrees until the back knee hovers above the floor.',
      'Push through your front heel to stand back up, alternating legs smoothly on each repetition.',
    ],
    tip: 'Keep your front knee stacked over your mid-foot and your torso tall throughout every step.',
  },
  {
    id: 'ex-glute-bridge',
    name: 'Dumbbell Glute Bridges',
    muscleGroup: 'Glutes • Hamstrings • Core',
    muscleGroups: ['lower', 'abs'],
    durations: [10, 15, 20],
    equipment: {
      kind: 'dumbbells',
      weightKg: 5,
      count: 1,
      label: '1x 5kg Dumbbell • Floor / Mat',
    },
    animationType: 'glute-bridge',
    active: true,
    steps: [
      'Lie on your back with knees bent, feet flat near your glutes, and hold one 5kg dumbbell securely across your hips.',
      'Press through your heels to lift your hips until shoulders, hips, and knees form a straight line.',
      'Pause and squeeze your glutes for 1 second at the top, then lower slowly back to the mat.',
    ],
    tip: 'Keep your ribs tucked down at the top so the lift comes from your glutes instead of your lower back.',
  },
  {
    id: 'ex-tempo-squat',
    name: 'Slow-Tempo Dumbbell Squats',
    muscleGroup: 'Quads • Glutes • Time Under Tension',
    muscleGroups: ['lower'],
    durations: [15, 20],
    equipment: {
      kind: 'dumbbells',
      weightKg: 5,
      count: 2,
      label: '2x 5kg Dumbbells • Standing',
    },
    animationType: 'squat',
    active: true,
    steps: [
      'Hold both 5kg dumbbells at your sides with feet shoulder-width apart and brace your core.',
      'Lower into a deep squat over a slow 3-second count and hold the bottom position for 1 full second.',
      'Drive strongly up to standing and immediately begin your next controlled descent.',
    ],
    tip: 'The slow eccentric builds serious leg strength even with moderate 5kg dumbbells.',
  },
];

const ABS_EXERCISES: readonly Exercise[] = [
  {
    id: 'ex-crunch',
    name: 'Controlled Floor Crunches',
    muscleGroup: 'Upper Abs • Core',
    muscleGroups: ['abs'],
    durations: [10, 15, 20],
    equipment: {
      kind: 'bodyweight',
      label: 'Bodyweight • Floor / Mat',
    },
    animationType: 'crunch',
    active: true,
    steps: [
      'Lie on your back with knees bent, feet flat on the floor, and hands reaching forward toward your knees.',
      'Exhale as you curl your shoulder blades smoothly off the mat by flexing your ribcage toward your pelvis.',
      'Pause briefly at the top, then lower your upper back down under control without yanking your neck.',
    ],
    tip: 'Keep a fist-sized space between your chin and chest so your abs—not your neck—do the work.',
  },
  {
    id: 'ex-russian-twist',
    name: 'Dumbbell Russian Twists',
    muscleGroup: 'Obliques • Rotational Core',
    muscleGroups: ['abs'],
    durations: [10, 15, 20],
    equipment: {
      kind: 'dumbbells',
      weightKg: 5,
      count: 1,
      label: '1x 5kg Dumbbell • Floor / Mat',
    },
    animationType: 'russian-twist',
    active: true,
    steps: [
      'Sit with knees bent, heels lightly planted, lean your torso back about 45 degrees, and hold one 5kg dumbbell with both hands.',
      'Rotate your ribcage smoothly to bring the dumbbell toward one hip while keeping your spine long.',
      'Sweep steadily across your center to the opposite side, moving from your torso rather than just your arms.',
    ],
    tip: 'Keep your chest lifted and breathe rhythmically—slow, controlled rotations beat fast swinging.',
  },
  {
    id: 'ex-leg-raise',
    name: 'Lying Leg Raises',
    muscleGroup: 'Lower Abs • Hip Flexors',
    muscleGroups: ['abs'],
    durations: [10, 15, 20],
    equipment: {
      kind: 'bodyweight',
      label: 'Bodyweight • Floor / Mat',
    },
    animationType: 'leg-raise',
    active: true,
    steps: [
      'Lie flat on your back with legs extended, hands resting beside your hips, and lower back gently pressed into the mat.',
      'Brace your core and raise both legs smoothly upward until they point toward the ceiling.',
      'Lower your legs slowly down until your heels hover just above the floor without letting your lower back arch.',
    ],
    tip: 'Soften your knees slightly if you feel your lower back lifting off the floor near the bottom.',
  },
  {
    id: 'ex-plank-tap',
    name: 'High Plank Shoulder Taps',
    muscleGroup: 'Deep Core • Anti-Rotation • Shoulders',
    muscleGroups: ['abs', 'upper'],
    durations: [10, 15, 20],
    equipment: {
      kind: 'bodyweight',
      label: 'Bodyweight • Floor / Mat',
    },
    animationType: 'plank-tap',
    active: true,
    steps: [
      'Set up in a strong high plank with hands under shoulders, glutes squeezed, and feet slightly wider than hip-width.',
      'Brace your abs hard and lift one hand smoothly to tap the opposite shoulder while keeping your hips level.',
      'Plant your hand back down under control and alternate sides without swaying side to side.',
    ],
    tip: 'Imagine balancing a glass of water on your lower back—zero hip rock is the goal.',
  },
  {
    id: 'ex-weighted-crunch',
    name: 'Weighted Dumbbell Crunches',
    muscleGroup: 'Upper Abs • Loaded Core',
    muscleGroups: ['abs'],
    durations: [15, 20],
    equipment: {
      kind: 'dumbbells',
      weightKg: 5,
      count: 1,
      label: '1x 5kg Dumbbell • Floor / Mat',
    },
    animationType: 'crunch',
    active: true,
    steps: [
      'Lie on your back with knees bent and hold one 5kg dumbbell vertically over your chest with arms straight.',
      'Exhale as you curl your upper back off the mat, reaching the dumbbell smoothly toward the ceiling.',
      'Lower back down vertebra by vertebra without letting momentum pull you back up.',
    ],
    tip: 'Reach straight up rather than forward toward your knees to keep continuous tension on your abs.',
  },
];

export function getExerciseCatalog(): Exercise[] {
  return [
    ...cloneDefaultExercises(),
    ...(structuredClone(EXTRA_UPPER_EXERCISES) as Exercise[]),
    ...(structuredClone(LOWER_BODY_EXERCISES) as Exercise[]),
    ...(structuredClone(ABS_EXERCISES) as Exercise[]),
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
  userExercises?: readonly Exercise[];
  previousExerciseIds?: readonly string[];
  random?: () => number;
}

export interface GeneratedWorkoutPreset {
  routineName: string;
  durationMin: WorkoutDurationMin;
  target: TargetMuscleGroup;
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
    userExercises = [],
    previousExerciseIds = [],
    random = Math.random,
  } = options;

  const fullPool = buildExercisePool(userExercises);
  const durationTagged = fullPool.filter((ex) => ex.durations.includes(durationMin));
  const durationPool = durationTagged.length >= 4 ? durationTagged : fullPool;

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
  let selected: Exercise[];

  if (target === 'full') {
    matchingPool = durationPool;
    selected = selectFullBodyExercises(durationPool, desiredCount, previousSet, random);
  } else {
    matchingPool = durationPool.filter((ex) => ex.muscleGroups.includes(target));
    const fallbackPool =
      matchingPool.length > 0
        ? matchingPool
        : fullPool.filter((ex) => ex.muscleGroups.includes(target));
    selected = pickWithVariation(fallbackPool, desiredCount, previousSet, random);
  }

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

  const timeline = buildCircuitTimeline(selected, settings);
  const estimatedDurationSec = computeTotalDuration(timeline);

  return {
    routineName: `${durationMin} min • ${targetMeta.label}`,
    durationMin,
    target,
    exercises: selected,
    settings,
    estimatedDurationSec,
    matchingPoolSize: matchingPool.length,
  };
}
