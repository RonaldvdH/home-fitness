/**
 * Versioned domain schemas, runtime normalizers, and v2 -> v3 migration helpers.
 * Pure TypeScript module with zero DOM or storage side effects.
 */

export const SCHEMA_VERSION = 3 as const;

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
] as const;

export type AnimationId = (typeof ANIMATION_IDS)[number];

export type EquipmentKind = 'dumbbells' | 'bodyweight' | 'kettlebell' | 'bands';

export interface EquipmentSpec {
  kind: EquipmentKind;
  weightKg?: number;
  count?: 1 | 2;
  label: string;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
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

export interface AppDataV3 {
  schemaVersion: typeof SCHEMA_VERSION;
  activeRoutineId: string;
  routines: Routine[];
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
]);

const ANIMATION_ID_SET: ReadonlySet<string> = new Set<string>(ANIMATION_IDS);

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
    if (lower.includes('bodyweight') || lower.includes('stretch') || lower.includes('mobility')) {
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
  | { ok: true; data: AppDataV3; migratedFromV2: boolean }
  | { ok: false; error: string };

/**
 * Validate and normalize imported or stored app data.
 * Accepts v3 envelopes, legacy v2 `{ exercises, settings, history }`, or bare exercise arrays.
 */
export function parseAppData(raw: unknown, fallbackData: AppDataV3): ParseImportResult {
  const defaultRoutine = fallbackData.routines[0];
  if (!defaultRoutine) {
    return { ok: false, error: 'Missing default routine template.' };
  }

  // Case 1: v3 structured envelope
  if (isRecord(raw) && raw.schemaVersion === SCHEMA_VERSION && Array.isArray(raw.routines)) {
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

    return {
      ok: true,
      migratedFromV2: false,
      data: {
        schemaVersion: SCHEMA_VERSION,
        activeRoutineId,
        routines,
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
      migratedFromV2: true,
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
      migratedFromV2: true,
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
        history: [...fallbackData.history],
      },
    };
  }

  return { ok: false, error: 'Unsupported backup format.' };
}
