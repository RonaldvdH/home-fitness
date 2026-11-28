/**
 * Pure runtime record normalizers for equipment, spaces, exercises, settings,
 * sessions, and routines.
 */

import {
  clampDumbbellWeight,
  DEFAULT_SETTINGS,
  EQUIPMENT_TAGS,
  isAnimationId,
  type AnimationId,
  type EquipmentKind,
  type EquipmentSpec,
  type EquipmentTag,
  type Exercise,
  type Routine,
  type SessionRecord,
  type WorkoutSettings,
  type WorkoutSpace,
} from './schema';
import {
  normalizeDurationTags,
  normalizeMuscleGroupTags,
  normalizeRequiredEquipment,
  normalizeWorkoutStyles,
} from './tagInference';

const EQUIPMENT_KINDS: ReadonlySet<string> = new Set<EquipmentKind>([
  'dumbbells',
  'bodyweight',
  'kettlebell',
  'bands',
  'foam-roller',
]);

const EQUIPMENT_TAG_SET: ReadonlySet<string> = new Set<string>(EQUIPMENT_TAGS);

export function isRecord(value: unknown): value is Record<string, unknown> {
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

function parseIsoTimestamp(raw: unknown, fallbackIso: string): string {
  if (typeof raw !== 'string' || raw.trim().length === 0) return fallbackIso;
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return fallbackIso;
  return new Date(parsed).toISOString();
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
