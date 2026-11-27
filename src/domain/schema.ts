/**
 * Versioned domain schemas (AppDataV4), runtime normalizers, and v2/v3 -> v4 migration helpers.
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

export interface WorkoutSettings {
  workSec: number;
  restSec: number;
  rounds: number;
  includeWarmup: boolean;
  includeCooldown: boolean;
  soundEnabled: boolean;
  voiceEnabled: boolean;
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
  demoSpeed: 1,
};

export const MAX_HISTORY_RECORDS = 100;

const EQUIPMENT_KINDS: ReadonlySet<string> = new Set<EquipmentKind>([
  'dumbbells',
  'bodyweight',
  'kettlebell',
  'bands',
  'foam-roller',
]);

const ANIMATION_ID_SET: ReadonlySet<string> = new Set<string>(ANIMATION_IDS);
const EQUIPMENT_TAG_SET: ReadonlySet<string> = new Set<string>(EQUIPMENT_TAGS);
const WORKOUT_STYLE_SET: ReadonlySet<string> = new Set<string>(WORKOUT_STYLES);

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
  'band-kickback',
]);

export function isAnimationId(value: unknown): value is AnimationId {
  return typeof value === 'string' && ANIMATION_ID_SET.has(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.round(num)));
}

function clampFloat(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function clampDumbbellWeight(value: unknown, fallback = 5): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  const clamped = Math.min(50, Math.max(1, num));
  return Math.round(clamped * 2) / 2;
}

function parseNonEmptyString(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function formatDumbbellWeight(equipment: EquipmentSpec): string | null {
  if (equipment.kind !== 'dumbbells') return null;
  if (typeof equipment.weightKg === 'number' && equipment.weightKg > 0) {
    return `${equipment.weightKg}kg`;
  }
  return 'DB';
}

export function normalizeEquipment(raw: unknown): EquipmentSpec {
  if (isRecord(raw)) {
    const kind: EquipmentKind =
      typeof raw.kind === 'string' && EQUIPMENT_KINDS.has(raw.kind)
        ? (raw.kind as EquipmentKind)
        : 'dumbbells';
    const rawWeight =
      typeof raw.weightKg === 'number' && Number.isFinite(raw.weightKg) && raw.weightKg > 0
        ? Math.round(raw.weightKg * 10) / 10
        : undefined;
    const count: 1 | 2 | undefined = raw.count === 1 || raw.count === 2 ? raw.count : undefined;
    const defaultLabel =
      kind === 'bodyweight'
        ? 'Bodyweight'
        : kind === 'dumbbells'
          ? `${count ?? 2}x ${rawWeight ?? 5}kg Dumbbells`
          : kind === 'kettlebell'
            ? `${rawWeight ?? 8}kg Kettlebell`
            : kind === 'foam-roller'
              ? 'Foam Roller • Floor / Mat'
              : 'Resistance Bands';
    const label = parseNonEmptyString(raw.label, defaultLabel);
    return {
      kind,
      ...(rawWeight !== undefined
        ? { weightKg: rawWeight }
        : kind === 'dumbbells'
          ? { weightKg: 5 }
          : {}),
      ...(count !== undefined ? { count } : kind === 'dumbbells' ? { count: 2 } : {}),
      label,
    };
  }

  if (typeof raw === 'string' && raw.trim().length > 0) {
    const label = raw.trim();
    const lower = label.toLowerCase();
    if (lower.includes('foam roller') || lower.includes('roller')) {
      return { kind: 'foam-roller', label };
    }
    if (
      lower.includes('bodyweight') ||
      lower.includes('stretch') ||
      lower.includes('mobility') ||
      lower.includes('wall')
    ) {
      return { kind: 'bodyweight', label };
    }
    if (lower.includes('kettlebell')) {
      const weightMatch = /(\d+(?:\.\d+)?)\s*kg/i.exec(label);
      return {
        kind: 'kettlebell',
        weightKg: weightMatch ? Number(weightMatch[1]) : 8,
        count: 1,
        label,
      };
    }
    if (lower.includes('band')) {
      return { kind: 'bands', label };
    }
    const weightMatch = /(\d+(?:\.\d+)?)\s*kg/i.exec(label);
    const countMatch = /\b([12])\s*x\b/i.exec(label);
    return {
      kind: 'dumbbells',
      weightKg: weightMatch ? Number(weightMatch[1]) : 5,
      count: countMatch && countMatch[1] === '1' ? 1 : 2,
      label,
    };
  }

  return {
    kind: 'dumbbells',
    weightKg: 5,
    count: 2,
    label: '2x 5kg Dumbbells',
  };
}

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

export function normalizeWorkoutSpace(raw: unknown, index = 0): WorkoutSpace | null {
  if (!isRecord(raw)) return null;
  const name = parseNonEmptyString(raw.name);
  if (!name) return null;

  const id = parseNonEmptyString(raw.id, `space-${index + 1}`);
  const rawEquipment = Array.isArray(raw.availableEquipment) ? raw.availableEquipment : [];
  const selected = new Set(
    rawEquipment.filter(
      (item): item is EquipmentTag => typeof item === 'string' && EQUIPMENT_TAG_SET.has(item),
    ),
  );
  const availableEquipment = EQUIPMENT_TAGS.filter((tag) => selected.has(tag));
  const dumbbellWeightKg = clampDumbbellWeight(raw.dumbbellWeightKg, 5);

  return {
    id,
    name,
    availableEquipment,
    dumbbellWeightKg,
  };
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

const MUSCLE_GROUP_TAG_SET: ReadonlySet<string> = new Set<string>(MUSCLE_GROUP_TAGS);
const WORKOUT_DURATION_SET: ReadonlySet<number> = new Set<number>(WORKOUT_DURATIONS);

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

export function normalizeExercise(raw: unknown, index = 0): Exercise | null {
  if (!isRecord(raw)) return null;

  const name = parseNonEmptyString(raw.name);
  if (!name) return null;

  const id = parseNonEmptyString(raw.id, `ex-migrated-${index + 1}`);
  const muscleGroup = parseNonEmptyString(raw.muscleGroup, 'Full Body');
  const equipment = normalizeEquipment(raw.equipment);
  const animationType: AnimationId = isAnimationId(raw.animationType)
    ? raw.animationType
    : 'overhead-press';
  const muscleGroups = normalizeMuscleGroupTags(raw.muscleGroups, animationType, muscleGroup);
  const durations = normalizeDurationTags(raw.durations);
  const requiredEquipment = normalizeRequiredEquipment(
    raw.requiredEquipment,
    equipment,
    animationType,
  );
  const styles = normalizeWorkoutStyles(raw.styles, equipment, animationType, muscleGroup);
  const active = typeof raw.active === 'boolean' ? raw.active : true;

  const rawSteps = Array.isArray(raw.steps)
    ? raw.steps.map((step) => parseNonEmptyString(step)).filter((step) => step.length > 0)
    : [];

  const steps =
    rawSteps.length > 0
      ? rawSteps
      : ['Perform the movement smoothly with controlled breathing and steady posture.'];

  const tip = parseNonEmptyString(
    raw.tip,
    'Maintain steady breathing and smooth control throughout each rep.',
  );

  const workSecOverride =
    typeof raw.workSecOverride === 'number' &&
    Number.isFinite(raw.workSecOverride) &&
    raw.workSecOverride >= 10
      ? clampNumber(raw.workSecOverride, 10, 300, 40)
      : undefined;

  return {
    id,
    name,
    muscleGroup,
    muscleGroups,
    durations,
    requiredEquipment,
    styles,
    equipment,
    animationType,
    active,
    steps,
    tip,
    ...(workSecOverride !== undefined ? { workSecOverride } : {}),
  };
}

export function normalizeSettings(raw: unknown): WorkoutSettings {
  if (!isRecord(raw)) return { ...DEFAULT_SETTINGS };

  return {
    workSec: clampNumber(raw.workSec, 10, 300, DEFAULT_SETTINGS.workSec),
    restSec: clampNumber(raw.restSec, 5, 180, DEFAULT_SETTINGS.restSec),
    rounds: clampNumber(raw.rounds, 1, 12, DEFAULT_SETTINGS.rounds),
    includeWarmup:
      typeof raw.includeWarmup === 'boolean' ? raw.includeWarmup : DEFAULT_SETTINGS.includeWarmup,
    includeCooldown:
      typeof raw.includeCooldown === 'boolean'
        ? raw.includeCooldown
        : DEFAULT_SETTINGS.includeCooldown,
    soundEnabled:
      typeof raw.soundEnabled === 'boolean' ? raw.soundEnabled : DEFAULT_SETTINGS.soundEnabled,
    voiceEnabled:
      typeof raw.voiceEnabled === 'boolean' ? raw.voiceEnabled : DEFAULT_SETTINGS.voiceEnabled,
    demoSpeed: clampFloat(raw.demoSpeed, 0.5, 1.5, DEFAULT_SETTINGS.demoSpeed),
  };
}

function parseIsoTimestamp(raw: unknown, fallbackIso: string): string {
  if (typeof raw !== 'string' || raw.trim().length === 0) return fallbackIso;
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return fallbackIso;
  return new Date(parsed).toISOString();
}

export function normalizeSessionRecord(
  raw: unknown,
  fallbackRoutineId: string,
  fallbackRoutineName: string,
  index = 0,
): SessionRecord | null {
  if (!isRecord(raw)) return null;

  const fallbackIso = new Date().toISOString();
  const completedAt = parseIsoTimestamp(raw.completedAt ?? raw.date, fallbackIso);

  const durationSec =
    typeof raw.durationSec === 'number' && Number.isFinite(raw.durationSec) && raw.durationSec > 0
      ? Math.round(raw.durationSec)
      : typeof raw.durationMin === 'number' &&
          Number.isFinite(raw.durationMin) &&
          raw.durationMin > 0
        ? Math.round(raw.durationMin * 60)
        : 60;

  return {
    id: parseNonEmptyString(raw.id, `sess-migrated-${index + 1}`),
    routineId: parseNonEmptyString(raw.routineId, fallbackRoutineId),
    routineName: parseNonEmptyString(raw.routineName, fallbackRoutineName),
    completedAt,
    durationSec,
    rounds: clampNumber(raw.rounds, 1, 20, 1),
    exerciseCount: clampNumber(raw.exerciseCount, 0, 100, 0),
    source: raw.source === 'manual' ? 'manual' : 'completed',
  };
}

export function normalizeRoutine(
  raw: unknown,
  fallbackRoutine: Routine,
  index = 0,
): Routine | null {
  if (!isRecord(raw)) return null;

  const rawExercises = Array.isArray(raw.exercises) ? raw.exercises : [];
  const exercises = rawExercises
    .map((item, idx) => normalizeExercise(item, idx))
    .filter((item): item is Exercise => item !== null);

  if (exercises.length === 0) return null;

  return {
    id: parseNonEmptyString(raw.id, `routine-${index + 1}`),
    name: parseNonEmptyString(raw.name, fallbackRoutine.name),
    exercises,
    settings: normalizeSettings(raw.settings),
    updatedAt: parseIsoTimestamp(raw.updatedAt, new Date().toISOString()),
  };
}

export type ParseImportResult =
  | { ok: true; data: AppDataV4; migratedFromVersion?: 2 | 3 }
  | { ok: false; error: string };

/**
 * Validate and normalize imported or stored app data.
 * Accepts v4 envelopes, v3 envelopes, legacy v2 `{ exercises, settings, history }`,
 * or bare exercise arrays, preserving all user data across lossless migrations.
 */
export function parseAppData(raw: unknown, fallbackData: AppDataV4): ParseImportResult {
  const defaultRoutine = fallbackData.routines[0];
  if (!defaultRoutine) {
    return { ok: false, error: 'Missing default routine template.' };
  }

  const fallbackSpaces = structuredClone(fallbackData.spaces) as WorkoutSpace[];
  const fallbackSpaceId = fallbackData.activeSpaceId || fallbackSpaces[0]?.id || 'space-home-gym';

  // Case 1: v4 or v3 structured envelope
  if (
    isRecord(raw) &&
    (raw.schemaVersion === SCHEMA_VERSION || raw.schemaVersion === 3) &&
    Array.isArray(raw.routines)
  ) {
    const routines = raw.routines
      .map((item, idx) => normalizeRoutine(item, defaultRoutine, idx))
      .filter((item): item is Routine => item !== null);

    if (routines.length === 0) {
      return { ok: false, error: 'Backup file does not contain any valid routines.' };
    }

    const activeRoutineId =
      typeof raw.activeRoutineId === 'string' &&
      routines.some((routine) => routine.id === raw.activeRoutineId)
        ? raw.activeRoutineId
        : routines[0]!.id;

    const activeRoutine = routines.find((r) => r.id === activeRoutineId) ?? routines[0]!;
    const rawHistory = Array.isArray(raw.history) ? raw.history : [];
    const history = rawHistory
      .map((entry, idx) => normalizeSessionRecord(entry, activeRoutine.id, activeRoutine.name, idx))
      .filter((entry): entry is SessionRecord => entry !== null)
      .slice(0, MAX_HISTORY_RECORDS);

    const parsedSpaces = Array.isArray(raw.spaces)
      ? raw.spaces
          .map((item, idx) => normalizeWorkoutSpace(item, idx))
          .filter((item): item is WorkoutSpace => item !== null)
      : [];
    const spaces = parsedSpaces.length > 0 ? parsedSpaces : fallbackSpaces;
    const activeSpaceId =
      typeof raw.activeSpaceId === 'string' && spaces.some((s) => s.id === raw.activeSpaceId)
        ? raw.activeSpaceId
        : (spaces[0]?.id ?? fallbackSpaceId);

    const isV3 = raw.schemaVersion === 3;

    return {
      ok: true,
      ...(isV3 ? { migratedFromVersion: 3 as const } : {}),
      data: {
        schemaVersion: SCHEMA_VERSION,
        activeRoutineId,
        routines,
        spaces,
        activeSpaceId,
        history,
      },
    };
  }

  // Case 2: Legacy v2 object { exercises, settings?, history? }
  if (isRecord(raw) && Array.isArray(raw.exercises)) {
    const exercises = raw.exercises
      .map((item, idx) => normalizeExercise(item, idx))
      .filter((item): item is Exercise => item !== null);

    if (exercises.length === 0) {
      return { ok: false, error: 'Backup file does not contain any valid exercises.' };
    }

    const settings = raw.settings
      ? normalizeSettings(raw.settings)
      : { ...defaultRoutine.settings };
    const rawHistory = Array.isArray(raw.history) ? raw.history : [];
    const history = rawHistory
      .map((entry, idx) =>
        normalizeSessionRecord(entry, defaultRoutine.id, defaultRoutine.name, idx),
      )
      .filter((entry): entry is SessionRecord => entry !== null)
      .slice(0, MAX_HISTORY_RECORDS);

    return {
      ok: true,
      migratedFromVersion: 2,
      data: {
        schemaVersion: SCHEMA_VERSION,
        activeRoutineId: defaultRoutine.id,
        routines: [
          {
            ...defaultRoutine,
            exercises,
            settings,
            updatedAt: new Date().toISOString(),
          },
        ],
        spaces: fallbackSpaces,
        activeSpaceId: fallbackSpaceId,
        history,
      },
    };
  }

  // Case 3: Legacy bare array of exercises
  if (Array.isArray(raw)) {
    const exercises = raw
      .map((item, idx) => normalizeExercise(item, idx))
      .filter((item): item is Exercise => item !== null);

    if (exercises.length === 0) {
      return { ok: false, error: 'Exercise list is empty or invalid.' };
    }

    return {
      ok: true,
      migratedFromVersion: 2,
      data: {
        schemaVersion: SCHEMA_VERSION,
        activeRoutineId: defaultRoutine.id,
        routines: [
          {
            ...defaultRoutine,
            exercises,
            updatedAt: new Date().toISOString(),
          },
        ],
        spaces: fallbackSpaces,
        activeSpaceId: fallbackSpaceId,
        history: [...fallbackData.history],
      },
    };
  }

  return { ok: false, error: 'Unsupported backup format.' };
}
