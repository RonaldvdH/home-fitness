import { describe, expect, it } from 'vitest';
import { ANIMATION_IDS } from '../src/domain/schema';
import {
  ANIMATION_MUSCLE_HIGHLIGHTS,
  BODY_REGIONS,
  getRegionColorSpec,
  HIGHLIGHT_COLORS,
  resolveMuscleHighlights,
} from '../src/engine/muscleHighlights';

describe('dynamic muscle-group highlighting engine', () => {
  it('defines at least one primary target region for every AnimationId', () => {
    for (const id of ANIMATION_IDS) {
      const spec = ANIMATION_MUSCLE_HIGHLIGHTS[id];
      expect(spec, `Missing muscle highlight spec for ${id}`).toBeDefined();
      expect(spec.primary.length, `${id} should have >= 1 primary region`).toBeGreaterThan(0);

      const resolved = resolveMuscleHighlights(id);
      const hasPrimary = BODY_REGIONS.some((region) => resolved[region] === 'primary');
      expect(hasPrimary).toBe(true);
    }
  });

  it('parses ordered exercise muscleGroup strings into primary and secondary body regions', () => {
    const curls = resolveMuscleHighlights('bicep-curl', 'Biceps • Forearms');
    expect(curls.upperArms).toBe('primary');
    expect(curls.forearms).toBe('secondary');
    expect(curls.thighs).toBe('neutral');

    const squats = resolveMuscleHighlights('squat', 'Quadriceps • Glutes • Core');
    expect(squats.thighs).toBe('primary');
    expect(squats.glutes).toBe('secondary');
    expect(squats.core).toBe('secondary');
    expect(squats.upperArms).toBe('neutral');

    const bridge = resolveMuscleHighlights('glute-bridge', 'Glutes • Hamstrings • Core');
    expect(bridge.glutes).toBe('primary');
    expect(bridge.thighs).toBe('secondary');
    expect(bridge.core).toBe('secondary');

    const pushup = resolveMuscleHighlights('push-up', 'Chest • Triceps • Core');
    expect(pushup.chestBack).toBe('primary');
    expect(pushup.upperArms).toBe('secondary');
    expect(pushup.core).toBe('secondary');

    // Custom exercise reusing an animation still colors dynamically from its label
    const customCalves = resolveMuscleHighlights('squat', 'Calves • Ankles');
    expect(customCalves.calves).toBe('primary');
    expect(customCalves.thighs).toBe('neutral');
  });

  it('falls back cleanly to animation defaults when muscleGroup text has no anatomy keywords', () => {
    const generic = resolveMuscleHighlights('russian-twist', 'Full Body Conditioning');
    expect(generic.core).toBe('primary');
    expect(generic.shoulders).toBe('secondary');
    expect(generic.thighs).toBe('neutral');
  });

  it('returns distinct color specs for primary, secondary, and neutral states', () => {
    const primary = getRegionColorSpec('thighs', 'primary');
    const secondary = getRegionColorSpec('thighs', 'secondary');
    const neutral = getRegionColorSpec('thighs', 'neutral');

    expect(primary.hex).toBe(HIGHLIGHT_COLORS.primary.hex);
    expect(secondary.hex).toBe(HIGHLIGHT_COLORS.secondary.hex);
    expect(neutral.hex).not.toBe(primary.hex);
    expect(neutral.hex).not.toBe(secondary.hex);
    expect(primary.peakEmissive).toBeGreaterThan(primary.baseEmissive);
    expect(neutral.peakEmissive).toBe(0);
  });
});
