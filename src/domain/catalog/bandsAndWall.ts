/**
 * Resistance band and wall exercise catalog entries.
 * Pure domain data with zero DOM or UI dependencies.
 */

import type { Exercise } from '../schema';

export const BAND_EXERCISES: readonly Exercise[] = [
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

export const WALL_EXERCISES: readonly Exercise[] = [
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
