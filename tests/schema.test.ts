import { describe, expect, it } from 'vitest';
import { createDefaultAppData } from '../src/domain/defaults';
import {
  normalizeEquipment,
  normalizeExercise,
  normalizeSettings,
  parseAppData,
  SCHEMA_VERSION,
} from '../src/domain/schema';
import {
  createLocalStorageAdapter,
  LEGACY_V2_KEYS,
  parseBackupJson,
  V3_STORAGE_KEY,
} from '../src/services/storage';

function createMemoryStorage(initial: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    dump: () => Object.fromEntries(map.entries()),
  };
}

describe('schema normalization & migration', () => {
  it('parses equipment strings into structured specs', () => {
    expect(normalizeEquipment('2x 8kg Dumbbells • Standing')).toEqual({
      kind: 'dumbbells',
      weightKg: 8,
      count: 2,
      label: '2x 8kg Dumbbells • Standing',
    });

    expect(normalizeEquipment('Bodyweight Mobility')).toEqual({
      kind: 'bodyweight',
      label: 'Bodyweight Mobility',
    });
  });

  it('rejects exercises without a name and fills safe defaults for missing steps', () => {
    expect(normalizeExercise({ name: '   ' })).toBeNull();

    const normalized = normalizeExercise({
      name: 'Hammer Curl',
      animationType: 'unknown-template',
      steps: [],
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.animationType).toBe('overhead-press');
    expect(normalized?.steps.length).toBeGreaterThan(0);
    expect(normalized?.equipment.kind).toBe('dumbbells');
  });

  it('clamps settings within valid bounds', () => {
    const settings = normalizeSettings({
      workSec: 3,
      restSec: 999,
      rounds: 0,
      demoSpeed: 9,
      voiceEnabled: false,
    });

    expect(settings.workSec).toBe(10);
    expect(settings.restSec).toBe(180);
    expect(settings.rounds).toBe(1);
    expect(settings.demoSpeed).toBe(1.5);
    expect(settings.voiceEnabled).toBe(false);
  });

  it('migrates legacy v2 backups and rejects invalid JSON', () => {
    const fallback = createDefaultAppData('2026-01-01T00:00:00.000Z');
    const legacyV2 = {
      exercises: [
        {
          id: 'ex-custom',
          name: 'Lateral Raises',
          muscleGroup: 'Delts',
          equipment: '2x 6kg Dumbbells',
          animationType: 'lateral-raise',
          active: true,
          steps: ['Stand tall', 'Raise to shoulder height', 'Lower slowly'],
        },
      ],
      settings: { workSec: 45, restSec: 15, rounds: 4 },
      history: [
        {
          id: 'sess-1',
          date: '2026-01-10T10:00:00.000Z',
          rounds: 4,
          durationMin: 16,
          exerciseCount: 1,
        },
      ],
    };

    const parsed = parseAppData(legacyV2, fallback);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.migratedFromV2).toBe(true);
      expect(parsed.data.schemaVersion).toBe(SCHEMA_VERSION);
      expect(parsed.data.routines[0]?.exercises[0]?.equipment.weightKg).toBe(6);
      expect(parsed.data.routines[0]?.settings.workSec).toBe(45);
      expect(parsed.data.history[0]?.durationSec).toBe(960);
    }

    const badJson = parseBackupJson('{not valid json', fallback);
    expect(badJson.ok).toBe(false);

    const wrongShape = parseAppData({ foo: 'bar' }, fallback);
    expect(wrongShape.ok).toBe(false);
  });

  it('migrates v2 localStorage keys independently even when one key is corrupt', () => {
    const mem = createMemoryStorage({
      [LEGACY_V2_KEYS.EXERCISES]: JSON.stringify([
        {
          id: 'ex-saved',
          name: 'Custom Dumbbell Press',
          muscleGroup: 'Chest',
          animationType: 'floor-press',
          active: true,
          steps: ['Lie down', 'Press up'],
        },
      ]),
      [LEGACY_V2_KEYS.HISTORY]: '<<<CORRUPT_JSON>>>',
    });

    const adapter = createLocalStorageAdapter(mem);
    const loaded = adapter.load();

    expect(loaded.schemaVersion).toBe(SCHEMA_VERSION);
    expect(loaded.routines[0]?.exercises).toHaveLength(1);
    expect(loaded.routines[0]?.exercises[0]?.name).toBe('Custom Dumbbell Press');
    expect(loaded.history).toEqual([]);
    expect(mem.getItem(V3_STORAGE_KEY)).not.toBeNull();
  });
});
