import { describe, expect, it } from 'vitest';
import { ANIMATION_IDS } from '../src/domain/schema';
import {
  ANIMATION_3D_REGISTRY,
  CAMERA_PRESETS,
  collectJointPositions,
  computeAnimation3DFrame,
  computeMotionGuidePaths3D,
  cross3,
  dist3,
  dot3,
  normalize3,
  RIG_DIMENSIONS,
  solveTwoBoneIK,
  sub3,
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

  it('produces symmetric, forearm-perpendicular 3D supination during bicep-curl', () => {
    const bottom = computeAnimation3DFrame('bicep-curl', 0).pose;
    const mid = computeAnimation3DFrame('bicep-curl', 0.25).pose;
    const peak = computeAnimation3DFrame('bicep-curl', 0.5).pose;

    // Bottom: neutral hammer grip aligned along +Z.
    expect(Math.abs(bottom.leftArm.dumbbellAxis.z)).toBeGreaterThan(0.95);
    expect(Math.abs(bottom.rightArm.dumbbellAxis.z)).toBeGreaterThan(0.95);

    // Mid-curl: left and right wrists supinate in opposite X directions (mirror symmetry across YZ).
    expect(mid.leftArm.dumbbellAxis.x).toBeGreaterThan(0.3);
    expect(mid.rightArm.dumbbellAxis.x).toBeLessThan(-0.3);
    expect(mid.leftArm.dumbbellAxis.x).toBeCloseTo(-mid.rightArm.dumbbellAxis.x, 3);
    expect(mid.leftArm.dumbbellAxis.y).toBeCloseTo(mid.rightArm.dumbbellAxis.y, 3);
    expect(mid.leftArm.dumbbellAxis.z).toBeCloseTo(mid.rightArm.dumbbellAxis.z, 3);

    // Peak: supinated palms-up grip rotated ~90° toward ±X.
    expect(peak.leftArm.dumbbellAxis.x).toBeGreaterThan(0.95);
    expect(peak.rightArm.dumbbellAxis.x).toBeLessThan(-0.95);
    expect(peak.rightArm.hand.y).toBeGreaterThan(bottom.rightArm.hand.y + 0.3);

    // Throughout the full curl cycle, both dumbbell bars remain perpendicular to their forearms.
    for (const t of SAMPLE_PHASES) {
      const pose = computeAnimation3DFrame('bicep-curl', t).pose;
      const leftForearm = normalize3(sub3(pose.leftArm.hand, pose.leftArm.elbow));
      const rightForearm = normalize3(sub3(pose.rightArm.hand, pose.rightArm.elbow));
      expect(Math.abs(dot3(leftForearm, pose.leftArm.dumbbellAxis))).toBeLessThan(0.02);
      expect(Math.abs(dot3(rightForearm, pose.rightArm.dumbbellAxis))).toBeLessThan(0.02);
    }
  });

  it('produces anatomically aligned 3D torso rotation during russian-twist with single shared dumbbell', () => {
    const rightTwist = computeAnimation3DFrame('russian-twist', 0).pose;
    const leftTwist = computeAnimation3DFrame('russian-twist', 0.5).pose;

    expect(rightTwist.prop).toEqual({ kind: 'dumbbells', count: 1 });
    expect(rightTwist.matAxis).toBe('z');
    expect(rightTwist.pelvis.y).toBeLessThanOrEqual(0.1);
    expect(rightTwist.leftLeg.ankle.y).toBeLessThanOrEqual(0.06);
    expect(rightTwist.rightLeg.ankle.y).toBeLessThanOrEqual(0.06);
    // Twisting toward -X (athlete's right) brings the left shoulder forward (+Z) and chest faces -X.
    expect(rightTwist.leftArm.shoulder.z).toBeGreaterThan(rightTwist.rightArm.shoulder.z);
    const rightChestFwd = cross3(
      sub3(rightTwist.leftArm.shoulder, rightTwist.rightArm.shoulder),
      sub3(rightTwist.chest, rightTwist.pelvis),
    );
    expect(rightChestFwd.x).toBeLessThan(0);

    // Twisting toward +X (athlete's left) pulls the left shoulder back (-Z) and chest faces +X.
    expect(leftTwist.leftArm.shoulder.z).toBeLessThan(leftTwist.rightArm.shoulder.z);
    const leftChestFwd = cross3(
      sub3(leftTwist.leftArm.shoulder, leftTwist.rightArm.shoulder),
      sub3(leftTwist.chest, leftTwist.pelvis),
    );
    expect(leftChestFwd.x).toBeGreaterThan(0);
    expect(Math.abs(leftTwist.rightArm.hand.x - rightTwist.rightArm.hand.x)).toBeGreaterThan(0.45);
  });

  it('keeps prone push-up and plank-tap knees anatomically straight without backward hyperextension', () => {
    for (const id of ['push-up', 'plank-tap'] as const) {
      for (const t of SAMPLE_PHASES) {
        const pose = computeAnimation3DFrame(id, t).pose;
        for (const leg of [pose.leftLeg, pose.rightLeg]) {
          // Interpolated Y along the straight hip-to-ankle line at the knee's X coordinate.
          const frac = (leg.knee.x - leg.hip.x) / (leg.ankle.x - leg.hip.x);
          const lineY = leg.hip.y + (leg.ankle.y - leg.hip.y) * frac;
          expect(leg.knee.y, `${id}@${t} knee hyperextended upward`).toBeLessThanOrEqual(
            lineY + 0.01,
          );
        }
      }
    }
  });

  it('grounds floor supine, seated, prone, and kneeling poses on the mat without floating', () => {
    const pelvisGroundedIds = [
      'floor-press',
      'glute-bridge',
      'crunch',
      'leg-raise',
      'russian-twist',
      'dead-bug',
      'superman',
      'roller-thoracic',
    ] as const;

    for (const id of pelvisGroundedIds) {
      const restPose = computeAnimation3DFrame(id, 0).pose;
      expect(restPose.pelvis.y, `${id} pelvis floating above mat`).toBeLessThanOrEqual(0.1);
    }

    for (const id of ['bird-dog', 'band-kickback'] as const) {
      const pose = computeAnimation3DFrame(id, 0).pose;
      const lowestKneeY = Math.min(pose.leftLeg.knee.y, pose.rightLeg.knee.y);
      expect(lowestKneeY, `${id} kneeling knee floating above mat`).toBeLessThanOrEqual(0.075);
    }
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

  it('generates finite 3D motion-guide paths for dynamic exercises and skips isometric holds', () => {
    expect(computeMotionGuidePaths3D('wall-sit')).toEqual([]);

    const curlPaths = computeMotionGuidePaths3D('bicep-curl');
    expect(curlPaths).toHaveLength(2);
    const curlBottom = computeAnimation3DFrame('bicep-curl', 0).pose;
    const curlPeak = computeAnimation3DFrame('bicep-curl', 0.5).pose;
    expect(dist3(curlPaths[0]![0]!, curlBottom.leftArm.hand)).toBeLessThan(0.01);
    expect(dist3(curlPaths[0]![curlPaths[0]!.length - 1]!, curlPeak.leftArm.hand)).toBeLessThan(
      0.01,
    );

    for (const id of ANIMATION_IDS) {
      if (id === 'wall-sit') continue;
      const paths = computeMotionGuidePaths3D(id);
      expect(paths.length, `${id} should have at least one 3D motion guide`).toBeGreaterThan(0);
      for (const pts of paths) {
        expect(pts.length).toBeGreaterThanOrEqual(2);
        for (const pt of pts) {
          expect(Number.isFinite(pt.x)).toBe(true);
          expect(Number.isFinite(pt.y)).toBe(true);
          expect(Number.isFinite(pt.z)).toBe(true);
        }
      }
    }
  });
});
