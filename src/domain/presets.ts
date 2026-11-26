/**
 * Curated workout preset catalog and generator for the New Workout setup overlay.
 * Pure TypeScript module with zero DOM or storage side effects.
 */

import { cloneDefaultExercises } from './defaults';
import type { Exercise, WorkoutSettings } from './schema';
import { buildCircuitTimeline, computeTotalDuration } from './timeline';

export const WORKOUT_DURATIONS = [10, 15, 20] as const;
export type WorkoutDurationMin = (typeof WORKOUT_DURATIONS)[number];

export type TargetMuscleGroup = 'upper' | 'lower' | 'abs' | 'full';

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

const LOWER_BODY_EXERCISES: readonly Exercise[] = [
  {
    id: 'ex-squat',
    name: 'Dumbbell Squats',
    muscleGroup: 'Quadriceps • Glutes • Core',
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
];

const ABS_EXERCISES: readonly Exercise[] = [
  {
    id: 'ex-crunch',
    name: 'Controlled Floor Crunches',
    muscleGroup: 'Upper Abs • Core',
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
];

function buildExercisesForTarget(
  target: TargetMuscleGroup,
  durationMin: WorkoutDurationMin,
): Exercise[] {
  if (target === 'upper') {
    return cloneDefaultExercises();
  }
  if (target === 'lower') {
    return structuredClone(LOWER_BODY_EXERCISES) as Exercise[];
  }
  if (target === 'abs') {
    return structuredClone(ABS_EXERCISES) as Exercise[];
  }

  // Full Body: curated compound mix spanning lower, push, pull, and core
  const upper = cloneDefaultExercises();
  const lower = structuredClone(LOWER_BODY_EXERCISES) as Exercise[];
  const abs = structuredClone(ABS_EXERCISES) as Exercise[];

  const baseFull: Exercise[] = [
    lower[0]!, // Dumbbell Squats
    upper[0]!, // Dumbbell Overhead Shoulder Press
    upper[1]!, // Bent-Over Dumbbell Rows
    abs[1]!, // Dumbbell Russian Twists
  ];

  if (durationMin === 15) {
    return [...baseFull, upper[2]!]; // + Floor Chest Press (5 moves)
  }
  if (durationMin === 20) {
    return [...baseFull, lower[1]!, upper[2]!]; // + RDL & Floor Chest Press (6 moves)
  }
  return baseFull;
}

export interface GeneratedWorkoutPreset {
  routineName: string;
  durationMin: WorkoutDurationMin;
  target: TargetMuscleGroup;
  exercises: Exercise[];
  settings: WorkoutSettings;
  estimatedDurationSec: number;
}

export function generateWorkoutPreset(
  durationMin: WorkoutDurationMin,
  target: TargetMuscleGroup,
  currentSettings: WorkoutSettings,
): GeneratedWorkoutPreset {
  const exercises = buildExercisesForTarget(target, durationMin);
  const targetMeta =
    TARGET_MUSCLE_GROUP_OPTIONS.find((opt) => opt.id === target) ?? TARGET_MUSCLE_GROUP_OPTIONS[0]!;

  // Calibrated intervals (including 2 min warm-up + 1 min cool-down):
  // - 10 min: 4 exercises x 2 rounds (35s/20s) = 10:00
  // - 15 min: 4 exercises x 3 rounds (40s/20s) = 14:40 | full-body 5 exercises x 3 rounds (35s/15s) = 15:15
  // - 20 min: 4 exercises x 4 rounds (45s/20s) = 20:00 | full-body 6 exercises x 3 rounds (40s/15s) = 19:15
  let timing: Pick<WorkoutSettings, 'workSec' | 'restSec' | 'rounds'>;
  if (durationMin === 10) {
    timing = { workSec: 35, restSec: 20, rounds: 2 };
  } else if (durationMin === 15) {
    timing =
      target === 'full'
        ? { workSec: 35, restSec: 15, rounds: 3 }
        : { workSec: 40, restSec: 20, rounds: 3 };
  } else {
    timing =
      target === 'full'
        ? { workSec: 40, restSec: 15, rounds: 3 }
        : { workSec: 45, restSec: 20, rounds: 4 };
  }

  const settings: WorkoutSettings = {
    ...currentSettings,
    ...timing,
    includeWarmup: true,
    includeCooldown: true,
  };

  const timeline = buildCircuitTimeline(exercises, settings);
  const estimatedDurationSec = computeTotalDuration(timeline);

  return {
    routineName: `${durationMin} min • ${targetMeta.label}`,
    durationMin,
    target,
    exercises,
    settings,
    estimatedDurationSec,
  };
}
