import { describe, expect, it } from 'vitest';
import { ANIMATION_IDS } from '../src/domain/schema';
import {
  ANIMATION_OPTIONS,
  ANIMATION_REGISTRY,
  computeAnimationFrame,
  getCueText,
  getSmoothCycle,
  lerp,
  type Point2D,
} from '../src/engine/animations';

function expectPointInViewBox(pt: Point2D): void {
  expect(Number.isFinite(pt.x)).toBe(true);
  expect(Number.isFinite(pt.y)).toBe(true);
  expect(pt.x).toBeGreaterThanOrEqual(0);
  expect(pt.x).toBeLessThanOrEqual(320);
  expect(pt.y).toBeGreaterThanOrEqual(0);
  expect(pt.y).toBeLessThanOrEqual(280);
}

describe('animations pose registry & math', () => {
  it('interpolates linearly with lerp', () => {
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 0.5)).toBe(15);
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it('produces a smooth 0 -> 1 -> 0 rep cycle', () => {
    expect(getSmoothCycle(0)).toBe(0);
    expect(getSmoothCycle(0.5)).toBe(1);
    expect(getSmoothCycle(0.97)).toBe(0);
    expect(getSmoothCycle(0.225)).toBeCloseTo(0.5, 4);
  });

  it('returns exercise-specific cue text', () => {
    expect(getCueText(0.2, 'floor-press')).toBe('Press Up');
    expect(getCueText(0.5, 'floor-press')).toBe('Lockout Hold');
    expect(getCueText(0.2, 'overhead-press')).toBe('Press Overhead');
    expect(getCueText(0.7, 'overhead-press')).toBe('Controlled Lower');
  });

  it('exposes every AnimationId in ANIMATION_OPTIONS and produces valid poses inside viewBox', () => {
    expect(ANIMATION_OPTIONS.map((o) => o.value)).toEqual([...ANIMATION_IDS]);

    const sampleTimes = [0, 0.25, 0.5, 0.75, 0.98];
    for (const id of ANIMATION_IDS) {
      expect(ANIMATION_REGISTRY[id].id).toBe(id);

      for (const t of sampleTimes) {
        const { pose, cue, progress } = computeAnimationFrame(id, t);
        expect(cue.length).toBeGreaterThan(0);
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(1);
        expect(pose.motionGuidePath.length).toBeGreaterThan(0);

        expectPointInViewBox(pose.head);
        expectPointInViewBox(pose.torsoHip);
        expectPointInViewBox(pose.torsoShoulder);
        pose.legLeft.forEach(expectPointInViewBox);
        pose.legRight.forEach(expectPointInViewBox);
        expectPointInViewBox(pose.rightArm.shoulder);
        expectPointInViewBox(pose.rightArm.elbow);
        expectPointInViewBox(pose.rightArm.hand);

        if (pose.leftArm) {
          expectPointInViewBox(pose.leftArm.shoulder);
          expectPointInViewBox(pose.leftArm.elbow);
          expectPointInViewBox(pose.leftArm.hand);
        }
      }
    }
  });

  it('supinates dumbbells smoothly during bicep-curl and keeps hands clear of the torso', () => {
    const bottom = ANIMATION_REGISTRY['bicep-curl'].computePose(0);
    const mid = ANIMATION_REGISTRY['bicep-curl'].computePose(0.5);
    const top = ANIMATION_REGISTRY['bicep-curl'].computePose(1);

    // Neutral grip (end-on foreshortened) at bottom -> halfway rotated -> full palms-up at top
    expect(bottom.leftArm?.dumbbellScaleX).toBeLessThan(0.35);
    expect(mid.leftArm?.dumbbellScaleX).toBeGreaterThan(bottom.leftArm!.dumbbellScaleX!);
    expect(mid.leftArm?.dumbbellScaleX).toBeLessThan(top.leftArm!.dumbbellScaleX!);
    expect(top.leftArm?.dumbbellScaleX).toBeCloseTo(1, 4);

    // Dumbbells stay well separated at the top (each dumbbell is 42px wide)
    expect(top.rightArm.hand.x - top.leftArm!.hand.x).toBeGreaterThanOrEqual(60);

    // Motion guide starts and ends on exact hand endpoints
    expect(bottom.motionGuidePath).toContain(
      `M ${bottom.leftArm!.hand.x} ${bottom.leftArm!.hand.y}`,
    );
    expect(top.motionGuidePath).toContain(`${top.leftArm!.hand.x} ${top.leftArm!.hand.y}`);
  });
});
