/**
 * Default exercise catalog, warm-up, and cool-down definitions.
 * Pure data module with no DOM or storage side effects.
 */

export const DEFAULT_EXERCISES = [
  {
    id: 'ex-overhead-press',
    name: 'Dumbbell Overhead Shoulder Press',
    muscleGroup: 'Shoulders (Deltoids) • Triceps',
    equipment: '2x 5kg Dumbbells • Standing',
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
    equipment: '2x 5kg Dumbbells • Standing Hinge',
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
    equipment: '2x 5kg Dumbbells • Floor / Mat',
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
    equipment: '2x 5kg Dumbbells • Standing',
    animationType: 'bicep-curl',
    active: true,
    steps: [
      'Stand tall with the 5kg dumbbells at your sides, palms facing forward, and elbows pinned close to your ribs.',
      'Curl both weights smoothly up toward your shoulders without swinging your torso or drifting your elbows forward.',
      'Lower the dumbbells all the way back down to full extension under steady tension.',
    ],
    tip: 'Squeeze your biceps hard at the top for half a second before lowering.',
  },
];

export const WARMUP_ITEM = {
  id: 'phase-warmup',
  name: 'Warm-Up: Arm Circles & Mobility',
  muscleGroup: 'Shoulders • Thoracic Spine • Elbows',
  equipment: 'Bodyweight Mobility',
  animationType: 'lateral-raise',
  steps: [
    'Perform 40 seconds of large, smooth forward and backward arm circles to warm up the shoulder capsules.',
    'Do 40 seconds of torso twists and scapular squeezes (pulling elbows back gently).',
    'Finish with 40 seconds of light bodyweight overhead reaches to prepare for the 5kg dumbbells.',
  ],
  tip: 'Move smoothly through your full pain-free range of motion.',
};

export const COOLDOWN_ITEM = {
  id: 'phase-cooldown',
  name: 'Cool-Down: Upper Body Stretch',
  muscleGroup: 'Deltoids • Chest • Biceps',
  equipment: 'Recovery Stretch',
  animationType: 'overhead-press',
  steps: [
    'Cross-body shoulder stretch: Gently pull your right arm across your chest for 15s, then switch sides.',
    'Chest & bicep opener: Clasp your hands behind your back and lift your chest gently for 15 seconds.',
    'Take slow, deep belly breaths while letting your shoulders drop away from your ears.',
  ],
  tip: 'Slow breathing signals your nervous system to shift into recovery.',
};
