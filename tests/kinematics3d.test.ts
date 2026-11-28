import { describe, expect, it } from 'vitest';
import { ANIMATION_IDS } from '../src/domain/schema';
import {
  ANIMATION_3D_REGISTRY,
  CAMERA_PRESETS,
  collectJointPositions,
  computeAnimation3DFrame,
  dist3,
  RIG_DIMENSIONS,
  solveTwoBoneIK,
  v3,
} from '../src/engine/kinematics3d';

const SAMPLE_PHASES = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 0.999] as const;

describe('pure 3D kinematics engine', () => {
  it('registers a 3D pose evaluator for every AnimationId', () => {
    for (const id of ANIMATION_IDS) {
      expect(ANIMATION_3D_REGISTRY[id]).toBeDefined();
      expect(CAMERA_PRESETS[ANIMATION_3D_REGISTRY[id].cameraPreset]).toBeDefined();
    }
  });

  it('solveTwoBoneIK preserves exact upper and lower bone lengths and bends toward pole', () => {
    const root = v3(0, 1.3, 0);
    const target = v3(0, 0.9, 0.2);
    const { mid, end } = solveTwoBoneIK(root, target, 0.28, 0.26, v3(0, 0, -1));

    expect(dist3(root, mid)).toBeCloseTo(0.28, 4);
    expect(dist3(mid, end)).toBeCloseTo(0.26, 4);
    expect(mid.z).toBeLessThan(target.z);
  });

  it('produces finite coordinates, valid bone lengths, and non-floor-clipping joints across all 28 animations', () => {
    for (const id of ANIMATION_IDS) {
      for (const t of SAMPLE_PHASES) {
        const frame = computeAnimation3DFrame(id, t);
        const { pose } = frame;

        expect(frame.cue.length).toBeGreaterThan(0);
        expect(Number.isFinite(frame.progress)).toBe(true);
        expect(CAMERA_PRESETS[pose.cameraPreset]).toBeDefined();

        const joints = collectJointPositions(pose);
        for (const [name, pt] of Object.entries(joints)) {
          expect(Number.isFinite(pt.x), `${id}@${t} ${name}.x`).toBe(true);
          expect(Number.isFinite(pt.y), `${id}@${t} ${name}.y`).toBe(true);
          expect(Number.isFinite(pt.z), `${id}@${t} ${name}.z`).toBe(true);
          // Floor plane sits at y = 0; allow tiny -0.02 tolerance for rounded toes/feet
          expect(pt.y, `${id}@${t} ${name} clipped floor`).toBeGreaterThanOrEqual(-0.02);
        }

        // Verify IK limb lengths stay anatomically intact across both arms and legs.
        expect(dist3(pose.leftArm.shoulder, pose.leftArm.elbow)).toBeCloseTo(
          RIG_DIMENSIONS.upperArm,
          2,
        );
        expect(dist3(pose.leftArm.elbow, pose.leftArm.hand)).toBeCloseTo(RIG_DIMENSIONS.forearm, 2);
        expect(dist3(pose.rightArm.shoulder, pose.rightArm.elbow)).toBeCloseTo(
          RIG_DIMENSIONS.upperArm,
          2,
        );
        expect(dist3(pose.rightArm.elbow, pose.rightArm.hand)).toBeCloseTo(
          RIG_DIMENSIONS.forearm,
          2,
        );
        expect(dist3(pose.leftLeg.hip, pose.leftLeg.knee)).toBeCloseTo(RIG_DIMENSIONS.thigh, 2);
        expect(dist3(pose.leftLeg.knee, pose.leftLeg.ankle)).toBeCloseTo(RIG_DIMENSIONS.shin, 2);
        expect(dist3(pose.rightLeg.hip, pose.rightLeg.knee)).toBeCloseTo(RIG_DIMENSIONS.thigh, 2);
        expect(dist3(pose.rightLeg.knee, pose.rightLeg.ankle)).toBeCloseTo(RIG_DIMENSIONS.shin, 2);
      }
    }
  });

  it('produces authentic 3D forearm supination during bicep-curl', () => {
    const bottom = computeAnimation3DFrame('bicep-curl', 0).pose;
    const peak = computeAnimation3DFrame('bicep-curl', 0.5).pose;

    // Bottom: neutral hammer grip aligned along Z.
    expect(Math.abs(bottom.rightArm.dumbbellAxis.z)).toBeGreaterThan(0.95);
    // Peak: supinated palms-up grip rotated ~90° toward X.
    expect(Math.abs(peak.rightArm.dumbbellAxis.x)).toBeGreaterThan(0.95);
    expect(peak.rightArm.hand.y).toBeGreaterThan(bottom.rightArm.hand.y + 0.3);
  });

  it('produces true 3D torso rotation during russian-twist with single shared dumbbell', () => {
    const leftSide = computeAnimation3DFrame('russian-twist', 0).pose;
    const rightSide = computeAnimation3DFrame('russian-twist', 0.5).pose;

    expect(leftSide.prop).toEqual({ kind: 'dumbbells', count: 1 });
    expect(leftSide.leftArm.shoulder.z).toBeLessThan(leftSide.rightArm.shoulder.z);
    expect(rightSide.leftArm.shoulder.z).toBeGreaterThan(rightSide.rightArm.shoulder.z);
    expect(Math.abs(rightSide.rightArm.hand.x - leftSide.rightArm.hand.x)).toBeGreaterThan(0.45);
  });

  it('assigns matching 3D props for wall, band, and foam-roller animations', () => {
    expect(computeAnimation3DFrame('wall-sit', 0.5).pose.prop.kind).toBe('wall');
    expect(computeAnimation3DFrame('wall-pushup', 0.5).pose.prop.kind).toBe('wall');
    expect(computeAnimation3DFrame('wall-angels', 0.5).pose.prop.kind).toBe('wall');

    expect(computeAnimation3DFrame('band-pull-apart', 0.5).pose.prop).toEqual({
      kind: 'band',
      mode: 'hands',
    });
    expect(computeAnimation3DFrame('band-row', 0.5).pose.prop).toEqual({
      kind: 'band',
      mode: 'feet-to-hands',
    });
    expect(computeAnimation3DFrame('band-kickback', 0.5).pose.prop).toEqual({
      kind: 'band',
      mode: 'ankles',
    });

    for (const rollerId of ['roller-thoracic', 'roller-quad', 'roller-glute'] as const) {
      const prop = computeAnimation3DFrame(rollerId, 0.5).pose.prop;
      expect(prop.kind).toBe('foam-roller');
      if (prop.kind === 'foam-roller') {
        expect(prop.position.y).toBeCloseTo(RIG_DIMENSIONS.rollerRadius, 3);
      }
    }
  });
});
