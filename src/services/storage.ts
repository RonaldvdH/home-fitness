import { createDefaultAppData } from '../domain/defaults';
import {
  normalizeExercise,
  normalizeSessionRecord,
  normalizeSettings,
  parseAppData,
  SCHEMA_VERSION,
  type AppDataV3,
  type ParseImportResult,
} from '../domain/schema';

export const V3_STORAGE_KEY = 'home_fitness_app_v3';

export const LEGACY_V2_KEYS = {
  EXERCISES: 'db5kg_studio_exercises_v2',
  SETTINGS: 'db5kg_studio_settings_v2',
  HISTORY: 'db5kg_studio_history_v2',
} as const;

export interface StorageAdapter {
  load: () => AppDataV3;
  save: (data: AppDataV3) => boolean;
}

function safeParseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Migrate independently from legacy v2 localStorage keys so a single corrupt key
 * never discards valid custom exercises or settings.
 */
function migrateFromLegacyV2(storage: Pick<Storage, 'getItem'>): AppDataV3 | null {
  const rawEx = safeParseJson(storage.getItem(LEGACY_V2_KEYS.EXERCISES));
  const rawSet = safeParseJson(storage.getItem(LEGACY_V2_KEYS.SETTINGS));
  const rawHist = safeParseJson(storage.getItem(LEGACY_V2_KEYS.HISTORY));

  if (rawEx === null && rawSet === null && rawHist === null) {
    return null;
  }

  const base = createDefaultAppData();
  const baseRoutine = base.routines[0]!;

  const exercises = Array.isArray(rawEx)
    ? rawEx
        .map((item, idx) => normalizeExercise(item, idx))
        .filter((item): item is NonNullable<typeof item> => item !== null)
    : [];

  const settings = rawSet !== null ? normalizeSettings(rawSet) : baseRoutine.settings;

  const history = Array.isArray(rawHist)
    ? rawHist
        .map((item, idx) => normalizeSessionRecord(item, baseRoutine.id, baseRoutine.name, idx))
        .filter((item): item is NonNullable<typeof item> => item !== null)
    : [];

  return {
    schemaVersion: SCHEMA_VERSION,
    activeRoutineId: baseRoutine.id,
    routines: [
      {
        ...baseRoutine,
        exercises: exercises.length > 0 ? exercises : baseRoutine.exercises,
        settings,
        updatedAt: new Date().toISOString(),
      },
    ],
    history,
  };
}

export function createLocalStorageAdapter(
  storage: Pick<Storage, 'getItem' | 'setItem'> | null = typeof window !== 'undefined'
    ? window.localStorage
    : null,
): StorageAdapter {
  return {
    load(): AppDataV3 {
      const fallback = createDefaultAppData();
      if (!storage) return fallback;

      try {
        const rawV3 = safeParseJson(storage.getItem(V3_STORAGE_KEY));
        if (rawV3 !== null) {
          const parsed = parseAppData(rawV3, fallback);
          if (parsed.ok) return parsed.data;
        }

        const migrated = migrateFromLegacyV2(storage);
        if (migrated) {
          this.save(migrated);
          return migrated;
        }
      } catch {
        return fallback;
      }

      return fallback;
    },

    save(data: AppDataV3): boolean {
      if (!storage) return false;
      try {
        storage.setItem(V3_STORAGE_KEY, JSON.stringify(data));
        return true;
      } catch {
        return false;
      }
    },
  };
}

export function serializeBackupJson(data: AppDataV3): string {
  return JSON.stringify(data, null, 2);
}

export function parseBackupJson(jsonText: string, fallbackData: AppDataV3): ParseImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { ok: false, error: 'File is not valid JSON.' };
  }
  return parseAppData(parsed, fallbackData);
}
