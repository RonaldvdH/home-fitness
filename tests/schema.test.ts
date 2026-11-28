import { describe, expect, it } from 'vitest';
import { createDefaultAppData, DEFAULT_SPACES } from '../src/domain/defaults';
import {
  normalizeEquipment,
  normalizeExercise,
  normalizeSettings,
  normalizeWorkoutSpace,
  parseAppData,
} from '../src/domain/migrations';
import {
  applySpaceToExercise,
  isExerciseEligibleForSpace,
  SCHEMA_VERSION,
} from '../src/domain/schema';
import {
  createLocalStorageAdapter,
  LEGACY_V2_KEYS,
  parseBackupJson,
  V3_STORAGE_KEY,
  V4_STORAGE_KEY,
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

describe('schema v4 normalization & lossless migration', () => {
  it('parses equipment strings into structured specs including bands and foam roller', () => {
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

    expect(normalizeEquipment('Elastic Band • Standing')).toEqual({
      kind: 'bands',
      label: 'Elastic Band • Standing',
    });

    expect(normalizeEquipment('Foam Roller • Floor / Mat')).toEqual({
      kind: 'foam-roller',
      label: 'Foam Roller • Floor / Mat',
    });
  });

  it('rejects exercises without a name and infers v4 equipment/style tags cleanly', () => {
    expect(normalizeExercise({ name: '   ' })).toBeNull();

    const normalized = normalizeExercise({
      name: 'Hammer Curl',
      animationType: 'unknown-template',
      steps: [],
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.animationType).toBe('overhead-press');
    expect(normalized?.muscleGroups).toEqual(['upper']);
    expect(normalized?.durations).toEqual([10, 15, 20]);
    expect(normalized?.requiredEquipment).toEqual(['dumbbells']);
    expect(normalized?.styles).toEqual(['strength']);
    expect(normalized?.steps.length).toBeGreaterThan(0);
    expect(normalized?.equipment.kind).toBe('dumbbells');

    const wallMove = normalizeExercise({
      name: 'Custom Wall Hold',
      muscleGroup: 'Quads',
      equipment: 'Wall • Bodyweight',
      animationType: 'wall-sit',
      steps: ['Press back flat against wall'],
    });
    expect(wallMove?.requiredEquipment).toEqual(['wall']);
  });

  it('normalizes WorkoutSpaces, checks equipment eligibility, and substitutes dumbbell weights', () => {
    expect(normalizeWorkoutSpace({ name: '   ' })).toBeNull();

    const space = normalizeWorkoutSpace({
      id: 'space-balcony',
      name: 'Balcony',
      availableEquipment: ['dumbbells', 'floor', 'invalid-tag', 'dumbbells'],
      dumbbellWeightKg: 7.4,
    });
    expect(space).toEqual({
      id: 'space-balcony',
      name: 'Balcony',
      availableEquipment: ['dumbbells', 'floor'],
      dumbbellWeightKg: 7.5,
    });

    const floorPress = normalizeExercise({
      id: 'ex-fp',
      name: 'Floor Press',
      muscleGroup: 'Chest',
      equipment: { kind: 'dumbbells', weightKg: 5, count: 2, label: '2x 5kg Dumbbells • Floor' },
      animationType: 'floor-press',
      steps: ['Hold 5kg dumbbells and press up.'],
      tip: 'Control the 5kg weights.',
    })!;

    expect(isExerciseEligibleForSpace(floorPress, space!)).toBe(true);
    expect(isExerciseEligibleForSpace(floorPress, DEFAULT_SPACES[2]!)).toBe(false); // Travel has no dumbbells

    const adapted = applySpaceToExercise(floorPress, space!);
    expect(adapted.equipment.weightKg).toBe(7.5);
    expect(adapted.equipment.label).toBe('2x 7.5kg Dumbbells • Floor');
    expect(adapted.steps[0]).toContain('7.5kg');
    expect(adapted.tip).toContain('7.5kg');
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

  it('migrates v3 backups and v3 localStorage losslessly to AppDataV4 with default Spaces', () => {
    const fallback = createDefaultAppData('2026-01-01T00:00:00.000Z');
    const v3Payload = {
      schemaVersion: 3,
      activeRoutineId: 'routine-custom',
      routines: [
        {
          id: 'routine-custom',
          name: 'My v3 Routine',
          exercises: [
            {
              id: 'ex-v3-floor',
              name: 'Floor Press',
              muscleGroup: 'Chest',
              muscleGroups: ['upper'],
              durations: [10, 15],
              equipment: {
                kind: 'dumbbells',
                weightKg: 6,
                count: 2,
                label: '2x 6kg Dumbbells • Floor / Mat',
              },
              animationType: 'floor-press',
              active: true,
              steps: ['Lie down', 'Press up', 'Lower slowly'],
              tip: 'Keep elbows tucked.',
            },
          ],
          settings: { workSec: 45, restSec: 15, rounds: 4 },
          updatedAt: '2026-02-01T10:00:00.000Z',
        },
      ],
      history: [
        {
          id: 'sess-v3',
          routineId: 'routine-custom',
          routineName: 'My v3 Routine',
          completedAt: '2026-02-02T10:00:00.000Z',
          durationSec: 900,
          rounds: 4,
          exerciseCount: 1,
          source: 'completed',
        },
      ],
    };

    const parsed = parseAppData(v3Payload, fallback);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.migratedFromVersion).toBe(3);
      expect(parsed.data.schemaVersion).toBe(SCHEMA_VERSION);
      expect(parsed.data.activeRoutineId).toBe('routine-custom');
      expect(parsed.data.routines[0]?.exercises[0]?.requiredEquipment).toEqual([
        'dumbbells',
        'floor',
      ]);
      expect(parsed.data.routines[0]?.exercises[0]?.styles).toEqual(['strength']);
      expect(parsed.data.spaces).toHaveLength(DEFAULT_SPACES.length);
      expect(parsed.data.activeSpaceId).toBe('space-home-gym');
      expect(parsed.data.history).toHaveLength(1);
    }

    // Verify LocalStorageAdapter migrates V3_STORAGE_KEY -> V4_STORAGE_KEY automatically
    const mem = createMemoryStorage({
      [V3_STORAGE_KEY]: JSON.stringify(v3Payload),
    });
    const adapter = createLocalStorageAdapter(mem);
    const loaded = adapter.load();
    expect(loaded.schemaVersion).toBe(SCHEMA_VERSION);
    expect(loaded.routines[0]?.name).toBe('My v3 Routine');
    expect(loaded.spaces.map((s) => s.name)).toEqual(['Home Gym', 'Living Room', 'Travel']);
    expect(mem.getItem(V4_STORAGE_KEY)).not.toBeNull();
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
      expect(parsed.migratedFromVersion).toBe(2);
      expect(parsed.data.schemaVersion).toBe(SCHEMA_VERSION);
      expect(parsed.data.routines[0]?.exercises[0]?.equipment.weightKg).toBe(6);
      expect(parsed.data.routines[0]?.exercises[0]?.requiredEquipment).toEqual(['dumbbells']);
      expect(parsed.data.routines[0]?.settings.workSec).toBe(45);
      expect(parsed.data.history[0]?.durationSec).toBe(960);
      expect(parsed.data.spaces.length).toBeGreaterThanOrEqual(3);
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
    expect(loaded.spaces).toHaveLength(DEFAULT_SPACES.length);
    expect(mem.getItem(V4_STORAGE_KEY)).not.toBeNull();
  });
});
