/**
 * Lossless schema migration engine (v2 / v3 / bare exercise arrays -> AppDataV4).
 * Re-exports field normalizers from `./normalizers.ts` as the public migration entrypoint.
 */

import {
  isRecord,
  normalizeExercise,
  normalizeRoutine,
  normalizeSessionRecord,
  normalizeSettings,
  normalizeWorkoutSpace,
} from './normalizers';
import {
  isWorkoutStyle,
  MAX_HISTORY_RECORDS,
  SCHEMA_VERSION,
  type AppDataV4,
  type Exercise,
  type Routine,
  type SessionRecord,
  type WorkoutSpace,
} from './schema';

export {
  normalizeEquipment,
  normalizeExercise,
  normalizeRoutine,
  normalizeSessionRecord,
  normalizeSettings,
  normalizeWorkoutSpace,
} from './normalizers';
export {
  inferMuscleGroupTags,
  inferRequiredEquipment,
  inferWorkoutStyles,
  normalizeDurationTags,
  normalizeMuscleGroupTags,
  normalizeRequiredEquipment,
  normalizeWorkoutStyles,
} from './tagInference';

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
    const preferredStyle = isWorkoutStyle(raw.preferredStyle)
      ? raw.preferredStyle
      : (fallbackData.preferredStyle ?? 'strength');

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
        preferredStyle,
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
