/**
 * Tagged exercise catalog and dynamic variation builder for the New Workout overlay.
 * Exercises are filtered by active Space equipment (`requiredEquipment`), `durations`,
 * and `muscleGroups`, then shuffled to produce varied circuits while honoring custom
 * user exercises and substituting the active Space's dumbbell weight.
 */

import { cloneDefaultExercises } from './defaults';
import {
  applySpaceToExercise,
  isExerciseEligibleForSpace,
  WORKOUT_DURATIONS,
  type Exercise,
  type MuscleGroupTag,
  type TargetMuscleGroup,
  type WorkoutDurationMin,
  type WorkoutSettings,
  type WorkoutSpace,
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
    requiredEquipment: ['dumbbells'],
    styles: ['strength'],
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
    requiredEquipment: ['dumbbells'],
    styles: ['strength'],
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
    requiredEquipment: ['dumbbells'],
    styles: ['strength'],
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
    requiredEquipment: ['dumbbells'],
    styles: ['strength'],
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
    requiredEquipment: ['dumbbells'],
    styles: ['strength'],
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
    requiredEquipment: ['dumbbells'],
    styles: ['strength'],
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
    requiredEquipment: ['dumbbells', 'floor'],
    styles: ['strength', 'pilates'],
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
    requiredEquipment: ['dumbbells'],
    styles: ['strength'],
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
    requiredEquipment: ['floor'],
    styles: ['strength', 'pilates'],
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
    requiredEquipment: ['dumbbells', 'floor'],
    styles: ['strength'],
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
    requiredEquipment: ['floor'],
    styles: ['strength', 'pilates'],
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
    requiredEquipment: ['floor'],
    styles: ['strength'],
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
    requiredEquipment: ['dumbbells', 'floor'],
    styles: ['strength'],
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

const BAND_EXERCISES: readonly Exercise[] = [
  {
    id: 'ex-band-pull-apart',
    name: 'Band Pull-Aparts',
    muscleGroup: 'Rear Delts • Upper Back • Posture',
    muscleGroups: ['upper'],
    durations: [10, 15, 20],
    requiredEquipment: ['bands'],
    styles: ['strength', 'mobility'],
    equipment: {
      kind: 'bands',
      label: 'Elastic Band • Standing',
    },
    animationType: 'band-pull-apart',
    active: true,
    steps: [
      'Stand tall holding an elastic resistance band at shoulder height with hands shoulder-width apart and elbows softly unlocked.',
      'Pull the band smoothly apart until your hands reach out to your sides and the band lightly touches your chest.',
      'Squeeze your shoulder blades together for a beat, then return slowly under constant tension.',
    ],
    tip: 'Keep your shoulders relaxed down away from your ears and avoid shrugging as you open wide.',
  },
  {
    id: 'ex-band-row',
    name: 'Banded Bent-Over Rows',
    muscleGroup: 'Lats • Mid-Back • Biceps',
    muscleGroups: ['upper'],
    durations: [10, 15, 20],
    requiredEquipment: ['bands'],
    styles: ['strength'],
    equipment: {
      kind: 'bands',
      label: 'Elastic Band • Standing Hinge',
    },
    animationType: 'band-row',
    active: true,
    steps: [
      'Stand on the middle of a resistance band with feet hip-width apart, hinge forward 45 degrees, and grip both ends.',
      'Drive your elbows straight back toward your ribs, squeezing your shoulder blades firmly at the top.',
      'Extend your arms slowly back down while maintaining steady band tension and a flat spine.',
    ],
    tip: 'Grip slightly lower on the band if you want extra resistance through the pulling phase.',
  },
  {
    id: 'ex-band-bicep-curl',
    name: 'Banded Bicep Curls',
    muscleGroup: 'Biceps • Forearms',
    muscleGroups: ['upper'],
    durations: [10, 15, 20],
    requiredEquipment: ['bands'],
    styles: ['strength'],
    equipment: {
      kind: 'bands',
      label: 'Elastic Band • Standing',
    },
    animationType: 'bicep-curl',
    active: true,
    steps: [
      'Stand evenly on the center of your elastic band and grip each side with palms turning upward as you curl.',
      'Pin your elbows close to your ribs and curl both hands smoothly up toward your shoulders.',
      'Pause at peak band tension for half a second, then lower with a slow 2-second return.',
    ],
    tip: 'Widen your stance on the band slightly to increase tension right from the bottom of the curl.',
  },
  {
    id: 'ex-band-glute-kickback',
    name: 'Banded Glute Kickbacks',
    muscleGroup: 'Glutes • Hamstrings • Core',
    muscleGroups: ['lower'],
    durations: [10, 15, 20],
    requiredEquipment: ['bands', 'floor'],
    styles: ['strength', 'pilates'],
    equipment: {
      kind: 'bands',
      label: 'Elastic Band • Floor / Mat',
    },
    animationType: 'band-kickback',
    active: true,
    steps: [
      'Loop a mini-band above your knees or around your foot and set up on hands and knees with a flat back.',
      'Brace your core and drive one heel straight back and slightly up against the band until your glute contracts fully.',
      'Return your knee smoothly toward the mat without letting your lower back arch, alternating halfway through.',
    ],
    tip: 'Keep both hip bones pointing straight down at the floor so your glute—not your lower back—drives the kick.',
  },
];

const WALL_EXERCISES: readonly Exercise[] = [
  {
    id: 'ex-wall-sit',
    name: 'Isometric Wall Sit',
    muscleGroup: 'Quadriceps • Glutes • Isometric Endurance',
    muscleGroups: ['lower'],
    durations: [10, 15, 20],
    requiredEquipment: ['wall'],
    styles: ['strength'],
    equipment: {
      kind: 'bodyweight',
      label: 'Wall • Bodyweight',
    },
    animationType: 'wall-sit',
    active: true,
    steps: [
      'Press your upper back and hips flat against a sturdy wall and walk your feet forward about two feet.',
      'Slide smoothly down until your thighs are parallel to the floor and your knees stack directly over your ankles.',
      'Hold steady with core braced and hands off your thighs, breathing slowly through the burn.',
    ],
    tip: 'Drive gently through your heels and keep your lower back pressed into the wall throughout the hold.',
  },
  {
    id: 'ex-wall-pushup',
    name: 'Incline Wall Push-Ups',
    muscleGroup: 'Chest • Front Delts • Triceps',
    muscleGroups: ['upper'],
    durations: [10, 15, 20],
    requiredEquipment: ['wall'],
    styles: ['strength'],
    equipment: {
      kind: 'bodyweight',
      label: 'Wall • Bodyweight',
    },
    animationType: 'wall-pushup',
    active: true,
    steps: [
      'Place both palms flat on a wall slightly wider than shoulder-width and step your feet back into a straight diagonal plank.',
      'Bend your elbows at a 45° angle from your ribs to lower your chest smoothly toward the wall.',
      'Press evenly through your palms to return to full arm extension while keeping your body in one rigid line.',
    ],
    tip: 'Step your feet farther back from the wall to increase challenge without losing core alignment.',
  },
  {
    id: 'ex-wall-angels',
    name: 'Wall Angels',
    muscleGroup: 'Upper Back • Shoulders • Thoracic Mobility',
    muscleGroups: ['upper'],
    durations: [10, 15, 20],
    requiredEquipment: ['wall'],
    styles: ['mobility', 'pilates'],
    equipment: {
      kind: 'bodyweight',
      label: 'Wall • Mobility',
    },
    animationType: 'wall-angels',
    active: true,
    steps: [
      'Stand with feet slightly forward, pressing your glutes, upper back, and head gently against the wall.',
      'Bring elbows and wrists against the wall in a goalpost shape, then glide both arms smoothly overhead into a Y.',
      'Draw your elbows slowly back down toward your ribs into a W while keeping your lower ribs from flaring.',
    ],
    tip: 'Stop raising your arms the moment your wrists or lower back peel off the wall—control beats height.',
  },
];

const BODYWEIGHT_FLOOR_EXERCISES: readonly Exercise[] = [
  {
    id: 'ex-pushup',
    name: 'Classic Floor Push-Ups',
    muscleGroup: 'Chest • Triceps • Core',
    muscleGroups: ['upper'],
    durations: [10, 15, 20],
    requiredEquipment: ['floor'],
    styles: ['strength'],
    equipment: {
      kind: 'bodyweight',
      label: 'Bodyweight • Floor / Mat',
    },
    animationType: 'push-up',
    active: true,
    steps: [
      'Set up in a strong high plank (or knees-down incline) with hands slightly wider than shoulders and core braced.',
      'Lower your chest smoothly toward the mat with elbows angled roughly 45 degrees back from your torso.',
      'Drive strongly through the floor to lock out your arms while keeping hips aligned with shoulders.',
    ],
    tip: 'Squeeze your glutes and thighs like a moving plank so your hips never sag on the way up.',
  },
  {
    id: 'ex-bird-dog',
    name: 'Controlled Bird-Dogs',
    muscleGroup: 'Deep Core • Lower Back • Glutes',
    muscleGroups: ['abs', 'upper'],
    durations: [10, 15, 20],
    requiredEquipment: ['floor'],
    styles: ['strength', 'pilates', 'mobility'],
    equipment: {
      kind: 'bodyweight',
      label: 'Bodyweight • Floor / Mat',
    },
    animationType: 'bird-dog',
    active: true,
    steps: [
      'Start on hands and knees with wrists under shoulders, knees under hips, and spine long and neutral.',
      'Exhale as you reach your right arm straight forward and extend your left leg straight back until parallel to the floor.',
      'Hold steady for 1 second without twisting your hips, return smoothly to tabletop, and switch sides.',
    ],
    tip: 'Reach long from fingertips to heel rather than lifting your leg high and arching your lower back.',
  },
  {
    id: 'ex-dead-bug',
    name: 'Core Dead Bugs',
    muscleGroup: 'Deep Core • Transverse Abs • Stability',
    muscleGroups: ['abs'],
    durations: [10, 15, 20],
    requiredEquipment: ['floor'],
    styles: ['strength', 'pilates'],
    equipment: {
      kind: 'bodyweight',
      label: 'Bodyweight • Floor / Mat',
    },
    animationType: 'dead-bug',
    active: true,
    steps: [
      'Lie on your back with arms pointed straight to the ceiling and knees bent at 90 degrees stacked over your hips.',
      'Press your lower back firmly into the mat while slowly extending opposite arm and leg toward the floor.',
      'Exhale to draw both limbs smoothly back to center and alternate sides under full control.',
    ],
    tip: 'Only lower your heel as far as you can while keeping zero gap between your lower back and the mat.',
  },
  {
    id: 'ex-superman',
    name: 'Prone Superman Holds',
    muscleGroup: 'Lower Back • Glutes • Upper Back',
    muscleGroups: ['upper', 'abs'],
    durations: [10, 15, 20],
    requiredEquipment: ['floor'],
    styles: ['strength', 'pilates', 'mobility'],
    equipment: {
      kind: 'bodyweight',
      label: 'Bodyweight • Floor / Mat',
    },
    animationType: 'superman',
    active: true,
    steps: [
      'Lie face down on your mat with arms extended overhead, legs long, and gaze pointed gently down at the floor.',
      'Squeeze your glutes and upper back to lift your chest, arms, and thighs smoothly a few inches off the mat.',
      'Pause briefly at the top without craning your neck, then lower back down under steady control.',
    ],
    tip: 'Keep your chin tucked slightly so the back of your neck stays long throughout every lift.',
  },
  {
    id: 'ex-bw-squat',
    name: 'Bodyweight Squats',
    muscleGroup: 'Quadriceps • Glutes • Mobility',
    muscleGroups: ['lower'],
    durations: [10, 15, 20],
    requiredEquipment: [],
    styles: ['strength', 'mobility'],
    equipment: {
      kind: 'bodyweight',
      label: 'Bodyweight • Standing',
    },
    animationType: 'squat',
    active: true,
    steps: [
      'Stand tall with feet shoulder-width apart, toes turned out slightly, and arms ready to counterbalance.',
      'Sit your hips back and down until thighs reach parallel while keeping your heels planted flat.',
      'Drive evenly through your feet to stand upright and squeeze your glutes smoothly at the top.',
    ],
    tip: 'Works in any Space with zero gear—focus on smooth depth and upright chest posture.',
  },
  {
    id: 'ex-bw-reverse-lunge',
    name: 'Bodyweight Reverse Lunges',
    muscleGroup: 'Quads • Glutes • Single-Leg Balance',
    muscleGroups: ['lower'],
    durations: [10, 15, 20],
    requiredEquipment: [],
    styles: ['strength'],
    equipment: {
      kind: 'bodyweight',
      label: 'Bodyweight • Standing',
    },
    animationType: 'reverse-lunge',
    active: true,
    steps: [
      'Stand upright with hands on hips or at your sides and brace your core lightly for balance.',
      'Step one foot straight back and lower both knees smoothly toward 90 degrees with torso tall.',
      'Push through your front heel to return to standing and alternate legs cleanly each rep.',
    ],
    tip: 'Take a generous step back so your front shin stays nearly vertical and knee-friendly.',
  },
  {
    id: 'ex-bw-glute-bridge',
    name: 'Bodyweight Glute Bridges',
    muscleGroup: 'Glutes • Hamstrings • Core',
    muscleGroups: ['lower', 'abs'],
    durations: [10, 15, 20],
    requiredEquipment: ['floor'],
    styles: ['strength', 'pilates'],
    equipment: {
      kind: 'bodyweight',
      label: 'Bodyweight • Floor / Mat',
    },
    animationType: 'glute-bridge',
    active: true,
    steps: [
      'Lie on your back with knees bent, feet hip-width apart near your glutes, and palms resting flat beside you.',
      'Drive through your heels to lift your hips smoothly until shoulders, hips, and knees align.',
      'Squeeze your glutes firmly at the top for 1 second, then articulate your spine back down to the mat.',
    ],
    tip: 'Exhale as you press up and avoid over-arching your lower back at the top.',
  },
];

const FOAM_ROLLER_EXERCISES: readonly Exercise[] = [
  {
    id: 'ex-roller-thoracic',
    name: 'Thoracic Spine Extensions',
    muscleGroup: 'Upper Back • Chest Opener • Posture',
    muscleGroups: ['upper'],
    durations: [10, 15, 20],
    requiredEquipment: ['foam-roller', 'floor'],
    styles: ['mobility', 'pilates'],
    equipment: {
      kind: 'foam-roller',
      label: 'Foam Roller • Floor / Mat',
    },
    animationType: 'roller-thoracic',
    active: true,
    steps: [
      'Place a foam roller horizontally beneath your mid-upper back, bend your knees with feet flat, and cradle your head in your hands.',
      'Keep your ribs anchored and hips planted as you exhale and drape your upper back gently over the roller.',
      'Curl smoothly back up to neutral, shift the roller an inch along your upper spine, and repeat.',
    ],
    tip: 'Keep your lower back steady on the floor so all extension happens cleanly through your mid-back.',
  },
  {
    id: 'ex-roller-quad',
    name: 'Quad & IT-Band Foam Roll',
    muscleGroup: 'Quads • Outer Thighs • Recovery',
    muscleGroups: ['lower'],
    durations: [10, 15, 20],
    requiredEquipment: ['foam-roller', 'floor'],
    styles: ['mobility'],
    equipment: {
      kind: 'foam-roller',
      label: 'Foam Roller • Floor / Mat',
    },
    animationType: 'roller-quad',
    active: true,
    steps: [
      'Support yourself on your forearms in a low plank with the foam roller positioned squarely under the fronts of your thighs.',
      'Use your forearms to glide slowly forward and back from just above your knees up toward your hip flexors.',
      'Pause for 3 to 5 slow breaths on any tender spot while keeping your core lightly engaged.',
    ],
    tip: 'Roll slowly at about an inch per second—rushing misses the deep myofascial release.',
  },
  {
    id: 'ex-roller-glute',
    name: 'Glute & Hip Foam Roll',
    muscleGroup: 'Glutes • Piriformis • Hip Mobility',
    muscleGroups: ['lower'],
    durations: [10, 15, 20],
    requiredEquipment: ['foam-roller', 'floor'],
    styles: ['mobility'],
    equipment: {
      kind: 'foam-roller',
      label: 'Foam Roller • Floor / Mat',
    },
    animationType: 'roller-glute',
    active: true,
    steps: [
      'Sit on top of the foam roller with hands planted behind you for support and cross one ankle over the opposite knee.',
      'Shift your weight gently toward the bent-knee glute and roll smoothly back and forth across the muscle.',
      'Breathe deeply into tight areas and switch sides cleanly halfway through the interval.',
    ],
    tip: 'Keep your chest lifted and control your weight through your hands and planted foot.',
  },
  {
    id: 'ex-roller-dead-bug',
    name: 'Roller Core Dead Bugs',
    muscleGroup: 'Deep Core • Balance • Spinal Stability',
    muscleGroups: ['abs'],
    durations: [10, 15, 20],
    requiredEquipment: ['foam-roller', 'floor'],
    styles: ['strength', 'pilates'],
    equipment: {
      kind: 'foam-roller',
      label: 'Foam Roller • Floor / Mat',
    },
    animationType: 'dead-bug',
    active: true,
    steps: [
      'Lie lengthwise along a full-length foam roller (or hold a shorter roller between hand and knee) with spine neutral.',
      'Brace your deep abs and slowly extend your opposite arm and leg while keeping your torso perfectly balanced.',
      'Return smoothly to center without wobbling and alternate sides with unhurried control.',
    ],
    tip: 'Move half as fast as usual—the instability turns every slow rep into a deep core challenge.',
  },
];

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
