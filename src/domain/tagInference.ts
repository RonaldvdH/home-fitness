/**
 * Pure exercise tag inference & normalization helpers (equipment, workout styles,
 * muscle groups, and durations).
 */

import {
  EQUIPMENT_TAGS,
  MUSCLE_GROUP_TAGS,
  WORKOUT_DURATIONS,
  WORKOUT_STYLES,
  type AnimationId,
  type EquipmentSpec,
  type EquipmentTag,
  type MuscleGroupTag,
  type WorkoutDurationMin,
  type WorkoutStyle,
} from './schema';

const EQUIPMENT_TAG_SET: ReadonlySet<string> = new Set<string>(EQUIPMENT_TAGS);
const WORKOUT_STYLE_SET: ReadonlySet<string> = new Set<string>(WORKOUT_STYLES);
const MUSCLE_GROUP_TAG_SET: ReadonlySet<string> = new Set<string>(MUSCLE_GROUP_TAGS);
const WORKOUT_DURATION_SET: ReadonlySet<number> = new Set<number>(WORKOUT_DURATIONS);

const FLOOR_ANIMATIONS: ReadonlySet<AnimationId> = new Set<AnimationId>([
  'floor-press',
  'glute-bridge',
  'crunch',
  'leg-raise',
  'russian-twist',
  'plank-tap',
  'band-kickback',
  'push-up',
  'bird-dog',
  'dead-bug',
  'superman',
  'roller-thoracic',
  'roller-quad',
  'roller-glute',
]);

const WALL_ANIMATIONS: ReadonlySet<AnimationId> = new Set<AnimationId>([
  'wall-sit',
  'wall-pushup',
  'wall-angels',
]);

const ROLLER_ANIMATIONS: ReadonlySet<AnimationId> = new Set<AnimationId>([
  'roller-thoracic',
  'roller-quad',
  'roller-glute',
]);

const BAND_ANIMATIONS: ReadonlySet<AnimationId> = new Set<AnimationId>([
  'band-pull-apart',
  'band-row',
  'band-bicep-curl',
  'band-kickback',
]);

export function inferRequiredEquipment(
  equipment: EquipmentSpec,
  animationType: AnimationId,
): EquipmentTag[] {
  const tags = new Set<EquipmentTag>();
  const lowerLabel = equipment.label.toLowerCase();

  if (equipment.kind === 'dumbbells') tags.add('dumbbells');
  if (
    equipment.kind === 'bands' ||
    BAND_ANIMATIONS.has(animationType) ||
    lowerLabel.includes('band')
  ) {
    tags.add('bands');
  }
  if (equipment.kind === 'kettlebell' || lowerLabel.includes('kettlebell')) {
    tags.add('kettlebell');
  }
  if (
    equipment.kind === 'foam-roller' ||
    ROLLER_ANIMATIONS.has(animationType) ||
    lowerLabel.includes('roller')
  ) {
    tags.add('foam-roller');
  }
  if (WALL_ANIMATIONS.has(animationType) || /\bwall\b/.test(lowerLabel)) {
    tags.add('wall');
  }
  if (FLOOR_ANIMATIONS.has(animationType) || /\b(floor|mat)\b/.test(lowerLabel)) {
    tags.add('floor');
  }

  return EQUIPMENT_TAGS.filter((tag) => tags.has(tag));
}

export function normalizeRequiredEquipment(
  raw: unknown,
  equipment: EquipmentSpec,
  animationType: AnimationId,
): EquipmentTag[] {
  if (Array.isArray(raw)) {
    const selected = new Set(
      raw.filter(
        (item): item is EquipmentTag => typeof item === 'string' && EQUIPMENT_TAG_SET.has(item),
      ),
    );
    return EQUIPMENT_TAGS.filter((tag) => selected.has(tag));
  }
  return inferRequiredEquipment(equipment, animationType);
}

export function inferWorkoutStyles(
  equipment: EquipmentSpec,
  animationType: AnimationId,
  muscleGroupLabel = '',
): WorkoutStyle[] {
  const styles = new Set<WorkoutStyle>();
  const lower = `${equipment.label} ${muscleGroupLabel}`.toLowerCase();

  if (
    equipment.kind === 'foam-roller' ||
    ROLLER_ANIMATIONS.has(animationType) ||
    animationType === 'wall-angels' ||
    /mobility|stretch|release|recovery/.test(lower)
  ) {
    styles.add('mobility');
  }

  if (
    animationType === 'glute-bridge' ||
    animationType === 'bird-dog' ||
    animationType === 'dead-bug' ||
    animationType === 'superman' ||
    animationType === 'leg-raise' ||
    animationType === 'crunch' ||
    animationType === 'wall-angels' ||
    animationType === 'band-kickback' ||
    /pilates/.test(lower)
  ) {
    styles.add('pilates');
  }

  if (styles.size === 0 || !ROLLER_ANIMATIONS.has(animationType)) {
    if (!/stretch|recovery/.test(lower)) {
      styles.add('strength');
    }
  }

  return WORKOUT_STYLES.filter((style) => styles.has(style));
}

export function normalizeWorkoutStyles(
  raw: unknown,
  equipment: EquipmentSpec,
  animationType: AnimationId,
  muscleGroupLabel = '',
): WorkoutStyle[] {
  if (Array.isArray(raw)) {
    const selected = new Set(
      raw.filter(
        (item): item is WorkoutStyle => typeof item === 'string' && WORKOUT_STYLE_SET.has(item),
      ),
    );
    const valid = WORKOUT_STYLES.filter((style) => selected.has(style));
    if (valid.length > 0) return valid;
  }
  return inferWorkoutStyles(equipment, animationType, muscleGroupLabel);
}

export function inferMuscleGroupTags(
  animationType: AnimationId,
  muscleGroupLabel = '',
): MuscleGroupTag[] {
  const lower = muscleGroupLabel.toLowerCase();
  const inferred = new Set<MuscleGroupTag>();

  if (
    animationType === 'squat' ||
    animationType === 'rdl' ||
    animationType === 'reverse-lunge' ||
    animationType === 'glute-bridge' ||
    animationType === 'band-kickback' ||
    animationType === 'wall-sit' ||
    animationType === 'roller-quad' ||
    animationType === 'roller-glute' ||
    /quad|glute|hamstring|leg|calf|lower|it-band/.test(lower)
  ) {
    inferred.add('lower');
  }
  if (
    animationType === 'crunch' ||
    animationType === 'leg-raise' ||
    animationType === 'russian-twist' ||
    animationType === 'plank-tap' ||
    animationType === 'bird-dog' ||
    animationType === 'dead-bug' ||
    animationType === 'superman' ||
    /abs|core|oblique/.test(lower)
  ) {
    inferred.add('abs');
  }
  if (
    animationType === 'overhead-press' ||
    animationType === 'bent-row' ||
    animationType === 'floor-press' ||
    animationType === 'bicep-curl' ||
    animationType === 'lateral-raise' ||
    animationType === 'front-raise' ||
    animationType === 'tricep-extension' ||
    animationType === 'band-pull-apart' ||
    animationType === 'band-row' ||
    animationType === 'band-bicep-curl' ||
    animationType === 'wall-pushup' ||
    animationType === 'wall-angels' ||
    animationType === 'push-up' ||
    animationType === 'roller-thoracic' ||
    /shoulder|delt|chest|pec|back|lat|bicep|tricep|arm|upper|thoracic/.test(lower)
  ) {
    inferred.add('upper');
  }

  return inferred.size > 0 ? Array.from(inferred) : ['upper'];
}

export function normalizeMuscleGroupTags(
  raw: unknown,
  animationType: AnimationId,
  muscleGroupLabel = '',
): MuscleGroupTag[] {
  if (Array.isArray(raw)) {
    const valid = Array.from(
      new Set(
        raw.filter(
          (item): item is MuscleGroupTag =>
            typeof item === 'string' && MUSCLE_GROUP_TAG_SET.has(item),
        ),
      ),
    );
    if (valid.length > 0) return valid;
  }
  return inferMuscleGroupTags(animationType, muscleGroupLabel);
}

export function normalizeDurationTags(raw: unknown): WorkoutDurationMin[] {
  if (Array.isArray(raw)) {
    const selected = new Set(
      raw
        .map((item) => Number(item))
        .filter((item): item is WorkoutDurationMin => WORKOUT_DURATION_SET.has(item)),
    );
    const valid = WORKOUT_DURATIONS.filter((d) => selected.has(d));
    if (valid.length > 0) return valid;
  }
  return [...WORKOUT_DURATIONS];
}
