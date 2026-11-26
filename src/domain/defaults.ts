import {
  DEFAULT_SETTINGS,
  SCHEMA_VERSION,
  type AppDataV3,
  type Exercise,
  type Routine,
} from './schema';

export const DEFAULT_ROUTINE_ID = 'routine-dumbbell-upper';
export const DEFAULT_ROUTINE_NAME = '5kg Dumbbell Upper Circuit';

export const DEFAULT_EXERCISES: readonly Exercise[] = [
  {
    id: 'ex-overhead-press',
    name: 'Dumbbell Overhead Shoulder Press',
    muscleGroup: 'Shoulders (Deltoids) • Triceps',
    equipment: {
      kind: 'dumbbells',
      weightKg: 5,
      count: 2,
      label: '2x 5kg Dumbbells • Standing',
    },
    animationType: 'overhead-press',
    active: true,
    steps: [
      'Stand tall with feet shoulder-width apart and hold the 5kg dumbbells at shoulder height, palms facing forward.',
      'Brace your core so your lower back stays neutral, then press both dumbbells smoothly overhead until arms extend.',
      'Lower the weights back down to shoulder rack position with a controlled 2-second tempo.',
    ],
    tip: 'Keep your ribs tucked down and avoid flaring your elbows completely flat to protect your shoulder joints.',
  },
  {
    id: 'ex-bent-row',
    name: 'Bent-Over Dumbbell Rows',
    muscleGroup: 'Upper & Mid-Back • Rear Delts',
    equipment: {
      kind: 'dumbbells',
      weightKg: 5,
      count: 2,
      label: '2x 5kg Dumbbells • Standing Hinge',
    },
    animationType: 'bent-row',
    active: true,
    steps: [
      'Hinge forward at your hips about 45 degrees with knees softly bent, spine flat, and arms hanging straight down.',
      'Pull both 5kg dumbbells up toward your ribcage by driving your elbows back and squeezing your shoulder blades.',
      'Lower the dumbbells smoothly back to full arm hang without rounding your upper back.',
    ],
    tip: 'Imagine pulling with your elbows rather than your hands to engage your lats and upper back.',
  },
  {
    id: 'ex-floor-press',
    name: 'Dumbbell Floor Chest Press',
    muscleGroup: 'Chest (Pectorals) • Triceps',
    equipment: {
      kind: 'dumbbells',
      weightKg: 5,
      count: 2,
      label: '2x 5kg Dumbbells • Floor / Mat',
    },
    animationType: 'floor-press',
    active: true,
    steps: [
      'Lie flat on your back with knees bent, feet planted, and upper arms resting on the floor at a 45° angle from your torso.',
      'Press both 5kg dumbbells straight up over your chest until your arms are extended.',
      'Lower slowly until the backs of your upper arms gently touch the floor, pause briefly, and press again.',
    ],
    tip: 'The floor naturally protects your shoulders from over-stretching at the bottom—pause 1 second on each rep.',
  },
  {
    id: 'ex-bicep-curl',
    name: 'Standing Bicep Curls',
    muscleGroup: 'Biceps • Forearms',
    equipment: {
      kind: 'dumbbells',
      weightKg: 5,
      count: 2,
      label: '2x 5kg Dumbbells • Standing',
    },
    animationType: 'bicep-curl',
    active: true,
    steps: [
      'Stand tall with the 5kg dumbbells hanging naturally at your sides in a neutral grip (palms facing your thighs) and elbows pinned close to your ribs.',
      'Curl both weights smoothly upward—rotating your wrists halfway up so your palms turn to face your shoulders without swinging your torso.',
      'Lower the dumbbells under steady tension, rotating your wrists back to a neutral grip beside your thighs.',
    ],
    tip: 'Squeeze your biceps with palms facing up at the top for half a second before rotating smoothly back down.',
  },
];

export const WARMUP_ITEM: Exercise = {
  id: 'phase-warmup',
  name: 'Warm-Up: Arm Circles & Mobility',
  muscleGroup: 'Shoulders • Thoracic Spine • Elbows',
  equipment: {
    kind: 'bodyweight',
    label: 'Bodyweight Mobility',
  },
  animationType: 'lateral-raise',
  active: true,
  steps: [
    'Perform 40 seconds of large, smooth forward and backward arm circles to warm up the shoulder capsules.',
    'Do 40 seconds of torso twists and scapular squeezes (pulling elbows back gently).',
    'Finish with 40 seconds of light bodyweight overhead reaches to prepare for your weights.',
  ],
  tip: 'Move smoothly through your full pain-free range of motion.',
};

export const COOLDOWN_ITEM: Exercise = {
  id: 'phase-cooldown',
  name: 'Cool-Down: Upper Body Stretch',
  muscleGroup: 'Deltoids • Chest • Biceps',
  equipment: {
    kind: 'bodyweight',
    label: 'Recovery Stretch',
  },
  animationType: 'overhead-press',
  active: true,
  steps: [
    'Cross-body shoulder stretch: Gently pull your right arm across your chest for 15s, then switch sides.',
    'Chest & bicep opener: Clasp your hands behind your back and lift your chest gently for 15 seconds.',
    'Take slow, deep belly breaths while letting your shoulders drop away from your ears.',
  ],
  tip: 'Slow breathing signals your nervous system to shift into recovery.',
};

export function cloneDefaultExercises(): Exercise[] {
  return structuredClone(DEFAULT_EXERCISES) as Exercise[];
}

export function createDefaultRoutine(nowIso = new Date().toISOString()): Routine {
  return {
    id: DEFAULT_ROUTINE_ID,
    name: DEFAULT_ROUTINE_NAME,
    exercises: cloneDefaultExercises(),
    settings: { ...DEFAULT_SETTINGS },
    updatedAt: nowIso,
  };
}

export function createDefaultAppData(nowIso = new Date().toISOString()): AppDataV3 {
  const routine = createDefaultRoutine(nowIso);
  return {
    schemaVersion: SCHEMA_VERSION,
    activeRoutineId: routine.id,
    routines: [routine],
    history: [],
  };
}
