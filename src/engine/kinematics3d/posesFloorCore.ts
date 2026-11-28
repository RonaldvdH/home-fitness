/**
 * Pure 3D pose definitions for floor, mat, and core exercises.
 */

import type { AnimationId } from '../../domain/schema';
import { lerp } from '../animations/math';
import { add3, buildSideFrame, lerp3, makeArm, makeLeg, normalize3, v3 } from './ik';
import { RIG_DIMENSIONS, type Animation3DDefinition } from './types';

export const FLOOR_CORE_3D_ANIMATIONS: Partial<Record<AnimationId, Animation3DDefinition>> = {
  // ── 3. Floor Supine / Seated Core & Pressing ───────────────────────────────
  'floor-press': {
    id: 'floor-press',
    cameraPreset: 'floor-three-quarter',
    computePose: (p) => {
      const pelvis = v3(0.05, 0.09, 0);
      const chest = v3(-0.41, 0.095, 0);
      const head = v3(-0.61, 0.108, 0);
      const f = buildSideFrame(pelvis, chest, head, v3(0, 1, 0));

      const handY = lerp(0.32, 0.59, p);
      const handZ = lerp(0.26, 0.18, p);
      return {
        ...f,
        leftArm: makeArm(f.lShoulder, v3(-0.37, handY, -handZ), v3(0.2, -0.9, -0.5), v3(0, 0, 1)),
        rightArm: makeArm(f.rShoulder, v3(-0.37, handY, handZ), v3(0.2, -0.9, 0.5), v3(0, 0, 1)),
        leftLeg: makeLeg(
          f.lHip,
          v3(0.54, RIG_DIMENSIONS.footSoleY, -0.15),
          v3(0, 1, 0),
          v3(1, 0, 0),
        ),
        rightLeg: makeLeg(
          f.rHip,
          v3(0.54, RIG_DIMENSIONS.footSoleY, 0.15),
          v3(0, 1, 0),
          v3(1, 0, 0),
        ),
        cameraPreset: 'floor-three-quarter',
        prop: { kind: 'dumbbells', count: 2 },
      };
    },
  },

  'glute-bridge': {
    id: 'glute-bridge',
    cameraPreset: 'floor-low',
    computePose: (p) => {
      const chest = v3(-0.4, 0.095, 0);
      const pelvis = v3(lerp(0.06, 0.04, p), lerp(0.09, 0.36, p), 0);
      const head = v3(-0.6, 0.108, 0);
      const f = buildSideFrame(pelvis, chest, head, v3(0.2, 0.98, 0));

      return {
        ...f,
        leftArm: makeArm(
          f.lShoulder,
          v3(pelvis.x + 0.02, pelvis.y + 0.08, -0.14),
          v3(0.2, -0.9, -0.4),
          v3(0, 0, 1),
        ),
        rightArm: makeArm(
          f.rShoulder,
          v3(pelvis.x + 0.02, pelvis.y + 0.08, 0.14),
          v3(0.2, -0.9, 0.4),
          v3(0, 0, 1),
        ),
        leftLeg: makeLeg(
          f.lHip,
          v3(0.54, RIG_DIMENSIONS.footSoleY, -0.14),
          v3(0.15, 1, 0),
          v3(1, 0, 0),
        ),
        rightLeg: makeLeg(
          f.rHip,
          v3(0.54, RIG_DIMENSIONS.footSoleY, 0.14),
          v3(0.15, 1, 0),
          v3(1, 0, 0),
        ),
        cameraPreset: 'floor-low',
        prop: { kind: 'dumbbells', count: 1 },
      };
    },
  },

  crunch: {
    id: 'crunch',
    cameraPreset: 'floor-low',
    computePose: (p) => {
      const curlAngle = lerp(0.02, 0.72, p);
      const pelvis = v3(0.06, 0.09, 0);
      const chest = v3(
        pelvis.x - Math.cos(curlAngle) * RIG_DIMENSIONS.torsoLength,
        pelvis.y + Math.sin(curlAngle) * RIG_DIMENSIONS.torsoLength,
        0,
      );
      const head = v3(
        chest.x - Math.cos(curlAngle + 0.35) * RIG_DIMENSIONS.neckHeadOffset,
        Math.max(0.108, chest.y + Math.sin(curlAngle + 0.35) * RIG_DIMENSIONS.neckHeadOffset),
        0,
      );
      const f = buildSideFrame(pelvis, chest, head, v3(Math.sin(curlAngle + 0.3), 0.9, 0));

      return {
        ...f,
        leftArm: makeArm(f.lShoulder, v3(head.x + 0.03, head.y + 0.02, -0.14), v3(0.3, 0.5, -0.8)),
        rightArm: makeArm(f.rShoulder, v3(head.x + 0.03, head.y + 0.02, 0.14), v3(0.3, 0.5, 0.8)),
        leftLeg: makeLeg(
          f.lHip,
          v3(0.54, RIG_DIMENSIONS.footSoleY, -0.15),
          v3(0, 1, 0),
          v3(1, 0, 0),
        ),
        rightLeg: makeLeg(
          f.rHip,
          v3(0.54, RIG_DIMENSIONS.footSoleY, 0.15),
          v3(0, 1, 0),
          v3(1, 0, 0),
        ),
        cameraPreset: 'floor-low',
        prop: { kind: 'none' },
      };
    },
  },

  'leg-raise': {
    id: 'leg-raise',
    cameraPreset: 'floor-low',
    computePose: (p) => {
      const pelvis = v3(-0.08, 0.09, 0);
      const chest = v3(-0.54, 0.095, 0);
      const head = v3(-0.74, 0.108, 0);
      const f = buildSideFrame(pelvis, chest, head, v3(0, 1, 0));

      const liftAngle = lerp(0.12, 1.46, p);
      const legReach = 0.8;
      const ankleX = pelvis.x + Math.cos(liftAngle) * legReach;
      const ankleY = Math.max(0.11, pelvis.y + Math.sin(liftAngle) * legReach);
      const toeDir = v3(-Math.sin(liftAngle) * 0.4, Math.cos(liftAngle), 0);

      return {
        ...f,
        leftArm: makeArm(f.lShoulder, v3(-0.05, RIG_DIMENSIONS.handFloorY, -0.22), v3(0, 0.1, -1)),
        rightArm: makeArm(f.rShoulder, v3(-0.05, RIG_DIMENSIONS.handFloorY, 0.22), v3(0, 0.1, 1)),
        leftLeg: makeLeg(f.lHip, v3(ankleX, ankleY, -0.1), v3(0.2, 1, 0), toeDir),
        rightLeg: makeLeg(f.rHip, v3(ankleX, ankleY, 0.1), v3(0.2, 1, 0), toeDir),
        cameraPreset: 'floor-low',
        prop: { kind: 'none' },
      };
    },
  },

  'russian-twist': {
    id: 'russian-twist',
    cameraPreset: 'floor-three-quarter',
    computePose: (p) => {
      // Seated twist grounded on the mat with genuine 3D torso rotation from right (-X) to left (+X).
      const twist = lerp(-0.85, 0.85, p);
      const pelvis = v3(0, 0.09, -0.05);
      const chest = v3(0, 0.42, -0.36);
      const head = v3(0, 0.61, -0.42);

      const cosT = Math.cos(twist);
      const sinT = Math.sin(twist);
      const shW = RIG_DIMENSIONS.shoulderHalfWidth;
      // Twisting toward +X (athlete's left) pulls the left shoulder back (-Z) and brings the right shoulder forward (+Z).
      const lShoulder = v3(chest.x + shW * cosT, chest.y - 0.02, chest.z - shW * sinT);
      const rShoulder = v3(chest.x - shW * cosT, chest.y - 0.02, chest.z + shW * sinT);

      // Both hands carry a single dumbbell clearly in front of chest, swinging cleanly side to side.
      const dbCenter = v3(Math.sin(twist) * 0.39, 0.33, 0.02 + Math.cos(twist) * 0.13);
      const lHand = add3(dbCenter, v3(0.06, 0.01, 0));
      const rHand = add3(dbCenter, v3(-0.06, -0.01, 0));

      return {
        pelvis,
        chest,
        head,
        headForward: normalize3(v3(Math.sin(twist * 0.6), -0.1, Math.cos(twist * 0.6))),
        leftArm: makeArm(lShoulder, lHand, v3(0.45, -0.55, 0.7), v3(0, 1, 0)),
        rightArm: makeArm(rShoulder, rHand, v3(-0.45, -0.55, 0.7), v3(0, 1, 0)),
        leftLeg: makeLeg(
          v3(0.11, 0.09, -0.02),
          v3(0.14, RIG_DIMENSIONS.footSoleY, 0.56),
          v3(0.1, 1, 0),
          v3(0, 0.75, 0.66),
        ),
        rightLeg: makeLeg(
          v3(-0.11, 0.09, -0.02),
          v3(-0.14, RIG_DIMENSIONS.footSoleY, 0.56),
          v3(-0.1, 1, 0),
          v3(0, 0.75, 0.66),
        ),
        cameraPreset: 'floor-three-quarter',
        matAxis: 'z',
        prop: { kind: 'dumbbells', count: 1 },
      };
    },
  },

  'dead-bug': {
    id: 'dead-bug',
    cameraPreset: 'floor-low',
    computePose: (p) => {
      const pelvis = v3(0.06, 0.09, 0);
      const chest = v3(-0.4, 0.095, 0);
      const head = v3(-0.6, 0.108, 0);
      const f = buildSideFrame(pelvis, chest, head, v3(0, 1, 0));

      // Right arm reaches overhead (-X) while left leg extends forward (+X); left arm + right leg hold tabletop.
      const rHand = v3(lerp(-0.38, -0.84, p), lerp(0.6, 0.18, p), 0.18);
      const lHand = v3(-0.38, 0.6, -0.18);

      const lAnkle = v3(lerp(0.42, 0.84, p), lerp(0.42, 0.14, p), -0.12);
      const rAnkle = v3(0.42, 0.42, 0.12);

      return {
        ...f,
        leftArm: makeArm(f.lShoulder, lHand, v3(0.2, 0.3, -0.9)),
        rightArm: makeArm(f.rShoulder, rHand, v3(-0.1, -0.4, 0.8)),
        leftLeg: makeLeg(f.lHip, lAnkle, v3(-0.15, 1, 0), v3(0.2, 0.98, 0)),
        rightLeg: makeLeg(f.rHip, rAnkle, v3(-0.3, 1, 0), v3(0.8, 0.5, 0)),
        cameraPreset: 'floor-low',
        prop: { kind: 'none' },
      };
    },
  },

  // ── 4. Floor Prone / Quadruped / Push-Ups ──────────────────────────────────
  'plank-tap': {
    id: 'plank-tap',
    cameraPreset: 'floor-three-quarter',
    computePose: (p) => {
      const chest = v3(-0.32, 0.54, 0);
      const pelvis = v3(0.12, 0.44, 0);
      const head = v3(-0.52, 0.6, 0);
      const f = buildSideFrame(pelvis, chest, head, v3(-0.4, -0.9, 0));

      // Right hand lifts cleanly off the floor to tap left shoulder while left arm holds solid plank.
      const rHand = lerp3(v3(-0.32, RIG_DIMENSIONS.handFloorY, 0.19), v3(-0.33, 0.5, -0.16), p);
      return {
        ...f,
        leftArm: makeArm(
          f.lShoulder,
          v3(-0.32, RIG_DIMENSIONS.handFloorY, -0.18),
          v3(0.5, 0, -0.8),
        ),
        rightArm: makeArm(f.rShoulder, rHand, v3(0.4, -0.6, 0.7)),
        leftLeg: makeLeg(f.lHip, v3(0.86, 0.08, -0.16), v3(0, -0.5, -0.2), v3(-0.2, -0.98, 0)),
        rightLeg: makeLeg(f.rHip, v3(0.86, 0.08, 0.16), v3(0, -0.5, 0.2), v3(-0.2, -0.98, 0)),
        cameraPreset: 'floor-three-quarter',
        prop: { kind: 'none' },
      };
    },
  },

  'push-up': {
    id: 'push-up',
    cameraPreset: 'floor-three-quarter',
    computePose: (p) => {
      const xShift = lerp(0, -0.07, p);
      const chestY = lerp(0.54, 0.22, p);
      const pelvisY = lerp(0.42, 0.18, p);
      const chest = v3(-0.32 + xShift, chestY, 0);
      const pelvis = v3(0.13 + xShift, pelvisY, 0);
      const head = v3(-0.52 + xShift, chestY + 0.05, 0);
      const f = buildSideFrame(pelvis, chest, head, v3(-0.3, -0.95, 0));

      return {
        ...f,
        leftArm: makeArm(
          f.lShoulder,
          v3(-0.32, RIG_DIMENSIONS.handFloorY, -0.24),
          v3(0.65, 0.35, -0.7),
        ),
        rightArm: makeArm(
          f.rShoulder,
          v3(-0.32, RIG_DIMENSIONS.handFloorY, 0.24),
          v3(0.65, 0.35, 0.7),
        ),
        leftLeg: makeLeg(f.lHip, v3(0.86, 0.08, -0.13), v3(0, -1, 0), v3(-0.2, -0.98, 0)),
        rightLeg: makeLeg(f.rHip, v3(0.86, 0.08, 0.13), v3(0, -1, 0), v3(-0.2, -0.98, 0)),
        cameraPreset: 'floor-three-quarter',
        prop: { kind: 'none' },
      };
    },
  },

  'bird-dog': {
    id: 'bird-dog',
    cameraPreset: 'floor-three-quarter',
    computePose: (p) => {
      const chest = v3(-0.22, 0.48, 0);
      const pelvis = v3(0.24, 0.47, 0);
      const head = v3(-0.42, 0.53, 0);
      const f = buildSideFrame(pelvis, chest, head, v3(-0.5, -0.85, 0));

      // Right arm reaches forward (-X), left leg extends straight back (+X).
      const rHand = lerp3(v3(-0.22, RIG_DIMENSIONS.handFloorY, 0.18), v3(-0.74, 0.52, 0.16), p);
      const lAnkle = lerp3(v3(0.56, RIG_DIMENSIONS.footSoleY, -0.12), v3(1.02, 0.5, -0.11), p);

      return {
        ...f,
        leftArm: makeArm(
          f.lShoulder,
          v3(-0.22, RIG_DIMENSIONS.handFloorY, -0.18),
          v3(0.5, 0, -0.8),
        ),
        rightArm: makeArm(f.rShoulder, rHand, v3(0.2, -0.9, 0.4)),
        leftLeg: makeLeg(f.lHip, lAnkle, v3(-0.2, -0.95, 0), v3(0.95, -0.25, 0)),
        rightLeg: makeLeg(
          f.rHip,
          v3(0.56, RIG_DIMENSIONS.footSoleY, 0.12),
          v3(-0.25, -0.95, 0),
          v3(1, 0, 0),
        ),
        cameraPreset: 'floor-three-quarter',
        prop: { kind: 'none' },
      };
    },
  },

  superman: {
    id: 'superman',
    cameraPreset: 'floor-low',
    computePose: (p) => {
      const lift = lerp(0, 0.17, p);
      const pelvis = v3(0.08, 0.09, 0);
      const chest = v3(-0.37, 0.095 + lift, 0);
      const head = v3(-0.56, 0.115 + lift * 1.35, 0);
      const f = buildSideFrame(pelvis, chest, head, v3(-0.8, -0.5, 0));

      const handY = Math.max(RIG_DIMENSIONS.handFloorY, 0.05 + lift * 1.9);
      const ankleY = Math.max(RIG_DIMENSIONS.footSoleY, 0.05 + lift * 1.5);
      return {
        ...f,
        leftArm: makeArm(f.lShoulder, v3(-0.84, handY, -0.22), v3(0, 0.25, -0.95)),
        rightArm: makeArm(f.rShoulder, v3(-0.84, handY, 0.22), v3(0, 0.25, 0.95)),
        leftLeg: makeLeg(f.lHip, v3(0.89, ankleY, -0.13), v3(0, -0.2, -0.95), v3(1, 0.2, 0)),
        rightLeg: makeLeg(f.rHip, v3(0.89, ankleY, 0.13), v3(0, -0.2, 0.95), v3(1, 0.2, 0)),
        cameraPreset: 'floor-low',
        prop: { kind: 'none' },
      };
    },
  },
};
