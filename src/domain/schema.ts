/**
 * Versioned domain schemas (AppDataV4), constants, and core pure domain helpers.
 * Runtime normalizers and v2/v3 -> v4 migrations live in `./normalizers.ts` and `./migrations.ts`.
 * Pure TypeScript module with zero DOM or storage side effects.
 */

export const SCHEMA_VERSION = 4 as const;

export const ANIMATION_IDS = [
  'overhead-press',
  'bent-row',
  'floor-press',
  'bicep-curl',
  'lateral-raise',
  'front-raise',
  'tricep-extension',
  'squat',
  'rdl',
  'reverse-lunge',
  'glute-bridge',
  'crunch',
  'leg-raise',
  'russian-twist',
  'plank-tap',
  'band-pull-apart',
  'band-row',
  'band-bicep-curl',
  'band-kickback',
  'wall-sit',
  'wall-pushup',
  'wall-angels',
  'push-up',
  'bird-dog',
  'dead-bug',
  'superman',
  'roller-thoracic',
  'roller-quad',
  'roller-glute',
  'pilates-hundred',
  'single-leg-stretch',
  'swan-prep',
  'side-leg-lift',
  'spine-twist',
  'clam-shell',
  'swimming',
  'cat-cow',
  'worlds-greatest-stretch',
  'childs-pose',
] as const;

export type AnimationId = (typeof ANIMATION_IDS)[number];

export const WORKOUT_DURATIONS = [10, 15, 20] as const;
export type WorkoutDurationMin = (typeof WORKOUT_DURATIONS)[number];

export const MUSCLE_GROUP_TAGS = ['upper', 'lower', 'abs'] as const;
export type MuscleGroupTag = (typeof MUSCLE_GROUP_TAGS)[number];

export type TargetMuscleGroup = MuscleGroupTag | 'full';

export const EQUIPMENT_TAGS = [
  'dumbbells',
  'bands',
  'wall',
  'floor',
  'foam-roller',
  'kettlebell',
] as const;

export type EquipmentTag = (typeof EQUIPMENT_TAGS)[number];

export const EQUIPMENT_TAG_LABELS: Record<EquipmentTag, string> = {
  dumbbells: 'Dumbbells',
  bands: 'Elastic Bands',
  wall: 'Wall',
  floor: 'Floor / Mat',
  'foam-roller': 'Foam Roller',
  kettlebell: 'Kettlebell',
};

export const WORKOUT_STYLES = ['strength', 'pilates', 'mobility'] as const;
export type WorkoutStyle = (typeof WORKOUT_STYLES)[number];

export const WORKOUT_STYLE_LABELS: Record<WorkoutStyle, string> = {
  strength: 'Strength',
  pilates: 'Pilates',
  mobility: 'Mobility',
};

const WORKOUT_STYLE_SET: ReadonlySet<string> = new Set<string>(WORKOUT_STYLES);

export function isWorkoutStyle(value: unknown): value is WorkoutStyle {
  return typeof value === 'string' && WORKOUT_STYLE_SET.has(value);
}

export type EquipmentKind = 'dumbbells' | 'bodyweight' | 'kettlebell' | 'bands' | 'foam-roller';

export interface EquipmentSpec {
  kind: EquipmentKind;
  weightKg?: number;
  count?: 1 | 2;
  label: string;
}

export interface WorkoutSpace {
  id: string;
  name: string;
  availableEquipment: EquipmentTag[];
  dumbbellWeightKg: number;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  muscleGroups: MuscleGroupTag[];
  durations: WorkoutDurationMin[];
  requiredEquipment: EquipmentTag[];
  styles: WorkoutStyle[];
  equipment: EquipmentSpec;
  animationType: AnimationId;
  active: boolean;
  steps: string[];
  tip: string;
  workSecOverride?: number;
}

export type AudioTheme = 'classic' | 'chime';

export interface WorkoutSettings {
  workSec: number;
  restSec: number;
  rounds: number;
  includeWarmup: boolean;
  includeCooldown: boolean;
  soundEnabled: boolean;
  voiceEnabled: boolean;
  audioTheme?: AudioTheme;
  demoSpeed: number;
}

export interface Routine {
  id: string;
  name: string;
  exercises: Exercise[];
  settings: WorkoutSettings;
  updatedAt: string;
}

export type SessionSource = 'completed' | 'manual';

export interface SessionRecord {
  id: string;
  routineId: string;
  routineName: string;
  completedAt: string;
  durationSec: number;
  rounds: number;
  exerciseCount: number;
  source: SessionSource;
}

export interface AppDataV4 {
  schemaVersion: typeof SCHEMA_VERSION;
  activeRoutineId: string;
  routines: Routine[];
  spaces: WorkoutSpace[];
  activeSpaceId: string;
  preferredStyle?: WorkoutStyle;
  history: SessionRecord[];
}

export type TimelinePhase = 'WARM-UP' | 'WORK' | 'REST' | 'COOL-DOWN';

export interface TimelineStep {
  phase: TimelinePhase;
  duration: number;
  round: number;
  totalRounds: number;
  exercise: Exercise;
}

export const DEFAULT_SETTINGS: WorkoutSettings = {
  workSec: 40,
  restSec: 20,
  rounds: 3,
  includeWarmup: true,
  includeCooldown: true,
  soundEnabled: true,
  voiceEnabled: true,
  audioTheme: 'classic',
  demoSpeed: 1,
};

export const MAX_HISTORY_RECORDS = 100;

const ANIMATION_ID_SET: ReadonlySet<string> = new Set<string>(ANIMATION_IDS);

export function isAnimationId(value: unknown): value is AnimationId {
  return typeof value === 'string' && ANIMATION_ID_SET.has(value);
}

export function clampDumbbellWeight(value: unknown, fallback = 5): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  const clamped = Math.min(50, Math.max(1, num));
  return Math.round(clamped * 2) / 2;
}

export function formatDumbbellWeight(equipment: EquipmentSpec): string | null {
  if (equipment.kind !== 'dumbbells') return null;
  if (typeof equipment.weightKg === 'number' && equipment.weightKg > 0) {
    return `${equipment.weightKg}kg`;
  }
  return 'DB';
}

export function isExerciseEligibleForSpace(exercise: Exercise, space: WorkoutSpace): boolean {
  if (exercise.requiredEquipment.length === 0) return true;
  const available = new Set<EquipmentTag>(space.availableEquipment);
  return exercise.requiredEquipment.every((tag) => available.has(tag));
}

/**
 * Substitute the active Space's dumbbell weight into dumbbell exercises so weight badges,
 * animated SVG labels, and form cues reflect the user's real hardware.
 */
export function applySpaceToExercise(exercise: Exercise, space: WorkoutSpace): Exercise {
  if (exercise.equipment.kind !== 'dumbbells') {
    return structuredClone(exercise) as Exercise;
  }

  const weightKg = clampDumbbellWeight(space.dumbbellWeightKg, exercise.equipment.weightKg ?? 5);
  const next = structuredClone(exercise) as Exercise;
  const weightPattern = /\b\d+(?:\.\d+)?kg\b/gi;

  next.equipment = {
    ...next.equipment,
    weightKg,
    label: weightPattern.test(next.equipment.label)
      ? next.equipment.label.replace(weightPattern, `${weightKg}kg`)
      : `${next.equipment.count ?? 2}x ${weightKg}kg Dumbbells`,
  };
  next.steps = next.steps.map((step) => step.replace(weightPattern, `${weightKg}kg`));
  next.tip = next.tip.replace(weightPattern, `${weightKg}kg`);
  return next;
}
