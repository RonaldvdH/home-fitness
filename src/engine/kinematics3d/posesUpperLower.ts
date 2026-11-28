/**
 * Pure 3D pose definitions for standing upper-body and lower-body exercises.
 */

import type { AnimationId } from '../../domain/schema';
import { lerp, smoothstep } from '../animations/math';
import {
  add3,
  buildSideFrame,
  buildStandingFrontPose,
  cross3,
  makeArm,
  makeLeg,
  normalize3,
  scale3,
  sub3,
  v3,
} from './ik';
import { RIG_DIMENSIONS, type Animation3DDefinition, type ArmPose3D, type Vec3 } from './types';

export const UPPER_LOWER_3D_ANIMATIONS: Partial<Record<AnimationId, Animation3DDefinition>> = {
  // ── 1. Standing Upper Body (Dumbbells) ─────────────────────────────────────
  'overhead-press': {
    id: 'overhead-press',
    cameraPreset: 'front',
    computePose: (p) => {
      const lHand = v3(lerp(0.32, 0.21, p), lerp(1.36, 1.78, p), lerp(0.12, 0.04, p));
      const rHand = v3(lerp(-0.32, -0.21, p), lerp(1.36, 1.78, p), lerp(0.12, 0.04, p));
      return buildStandingFrontPose({
        leftHand: lHand,
        rightHand: rHand,
        leftPole: v3(0.75, -0.5, 0.35),
        rightPole: v3(-0.75, -0.5, 0.35),
        leftDumbbellAxis: v3(1, 0, 0),
        rightDumbbellAxis: v3(1, 0, 0),
        cameraPreset: 'front',
        prop: { kind: 'dumbbells', count: 2 },
      });
    },
  },

  'bent-row': {
    id: 'bent-row',
    cameraPreset: 'three-quarter',
    computePose: (p) => {
      const pelvis = v3(-0.16, 0.8, 0);
      const chest = v3(0.24, 1.03, 0);
      const head = v3(0.41, 1.15, 0);
      const f = buildSideFrame(pelvis, chest, head, v3(0.85, -0.45, 0));

      const lHand = v3(lerp(0.24, 0.02, p), lerp(0.55, 0.84, p), -0.22);
      const rHand = v3(lerp(0.24, 0.02, p), lerp(0.55, 0.84, p), 0.22);
      return {
        ...f,
        leftArm: makeArm(f.lShoulder, lHand, v3(-0.75, 0.65, -0.2), v3(1, 0, 0)),
        rightArm: makeArm(f.rShoulder, rHand, v3(-0.75, 0.65, 0.2), v3(1, 0, 0)),
        leftLeg: makeLeg(
          f.lHip,
          v3(-0.04, RIG_DIMENSIONS.footSoleY, -0.14),
          v3(1, 0.1, 0),
          v3(1, 0, 0),
        ),
        rightLeg: makeLeg(
          f.rHip,
          v3(-0.04, RIG_DIMENSIONS.footSoleY, 0.14),
          v3(1, 0.1, 0),
          v3(1, 0, 0),
        ),
        cameraPreset: 'three-quarter',
        prop: { kind: 'dumbbells', count: 2 },
      };
    },
  },

  'bicep-curl': {
    id: 'bicep-curl',
    cameraPreset: 'three-quarter',
    computePose: (p) => {
      // True 3D forearm supination: bottom neutral hammer grip -> top palms-up,
      // rotating symmetrically outward on each side while staying perpendicular to each forearm.
      const supination = smoothstep(0.12, 0.82, p);
      const angle = supination * (Math.PI / 2);

      const curlTheta = lerp(0.08, 2.38, p);
      const elbowY = 1.01;
      const elbowZ = lerp(0.01, 0.08, p);
      const forearmLen = RIG_DIMENSIONS.forearm;

      const lHand = v3(
        lerp(0.26, 0.22, p),
        elbowY - Math.cos(curlTheta) * forearmLen,
        elbowZ + Math.sin(curlTheta) * forearmLen,
      );
      const rHand = v3(
        lerp(-0.26, -0.22, p),
        elbowY - Math.cos(curlTheta) * forearmLen,
        elbowZ + Math.sin(curlTheta) * forearmLen,
      );

      const pose = buildStandingFrontPose({
        leftHand: lHand,
        rightHand: rHand,
        leftPole: v3(0.25, -0.65, -0.7),
        rightPole: v3(-0.25, -0.65, -0.7),
        cameraPreset: 'three-quarter',
        prop: { kind: 'dumbbells', count: 2 },
      });

      // Construct an orthonormal grip plane perpendicular to each solved forearm vector.
      // Neutral (hammer) grip has thumb pointing forward/up in the sagittal plane;
      // supination rotates the thumb outward (+X on left, -X on right) and pinky inward toward the body.
      const computeSupinatedAxis = (arm: ArmPose3D, sideSign: 1 | -1): Vec3 => {
        const forearmDir = normalize3(sub3(arm.hand, arm.elbow), v3(0, -1, 0));
        const neutralAxis = normalize3(v3(0, forearmDir.z, -forearmDir.y), v3(0, 0, 1));
        const supinatedOutward = normalize3(
          scale3(cross3(neutralAxis, forearmDir), sideSign),
          v3(sideSign, 0, 0),
        );
        return normalize3(
          add3(scale3(supinatedOutward, Math.sin(angle)), scale3(neutralAxis, Math.cos(angle))),
          v3(sideSign, 0, 0),
        );
      };

      pose.leftArm.dumbbellAxis = computeSupinatedAxis(pose.leftArm, 1);
      pose.rightArm.dumbbellAxis = computeSupinatedAxis(pose.rightArm, -1);
      return pose;
    },
  },

  'lateral-raise': {
    id: 'lateral-raise',
    cameraPreset: 'front',
    computePose: (p) => {
      const raiseAngle = lerp(0.16, 1.5, p);
      const reach = 0.51;
      const lHand = v3(
        0.19 + Math.sin(raiseAngle) * reach,
        1.28 - Math.cos(raiseAngle) * reach,
        lerp(0.05, 0.14, p),
      );
      const rHand = v3(
        -0.19 - Math.sin(raiseAngle) * reach,
        1.28 - Math.cos(raiseAngle) * reach,
        lerp(0.05, 0.14, p),
      );
      return buildStandingFrontPose({
        leftHand: lHand,
        rightHand: rHand,
        leftPole: v3(0.2, -0.35, -0.9),
        rightPole: v3(-0.2, -0.35, -0.9),
        leftDumbbellAxis: v3(0, 0, 1),
        rightDumbbellAxis: v3(0, 0, 1),
        cameraPreset: 'front',
        prop: { kind: 'dumbbells', count: 2 },
      });
    },
  },

  'front-raise': {
    id: 'front-raise',
    cameraPreset: 'three-quarter',
    computePose: (p) => {
      const pelvis = v3(-0.04, 0.85, 0);
      const chest = v3(-0.03, 1.31, 0);
      const head = v3(-0.01, 1.52, 0);
      const f = buildSideFrame(pelvis, chest, head, v3(1, 0, 0));

      const angle = lerp(0.18, 1.52, p);
      const reach = 0.51;
      const handX = chest.x + Math.sin(angle) * reach;
      const handY = chest.y - Math.cos(angle) * reach;
      return {
        ...f,
        leftArm: makeArm(f.lShoulder, v3(handX, handY, -0.18), v3(0, -1, -0.25), v3(0, 0, 1)),
        rightArm: makeArm(f.rShoulder, v3(handX, handY, 0.18), v3(0, -1, 0.25), v3(0, 0, 1)),
        leftLeg: makeLeg(
          f.lHip,
          v3(-0.02, RIG_DIMENSIONS.footSoleY, -0.14),
          v3(1, 0, 0),
          v3(1, 0, 0),
        ),
        rightLeg: makeLeg(
          f.rHip,
          v3(-0.02, RIG_DIMENSIONS.footSoleY, 0.14),
          v3(1, 0, 0),
          v3(1, 0, 0),
        ),
        cameraPreset: 'three-quarter',
        prop: { kind: 'dumbbells', count: 2 },
      };
    },
  },

  'tricep-extension': {
    id: 'tricep-extension',
    cameraPreset: 'three-quarter',
    computePose: (p) => {
      // Both hands hold one overhead dumbbell behind the head and extend straight up.
      const lHand = v3(0.06, lerp(1.37, 1.82, p), lerp(-0.16, 0.02, p));
      const rHand = v3(-0.06, lerp(1.37, 1.82, p), lerp(-0.16, 0.02, p));
      return buildStandingFrontPose({
        leftHand: lHand,
        rightHand: rHand,
        leftPole: v3(0.25, 0.7, 0.65),
        rightPole: v3(-0.25, 0.7, 0.65),
        leftDumbbellAxis: v3(0, 1, 0),
        rightDumbbellAxis: v3(0, 1, 0),
        cameraPreset: 'three-quarter',
        prop: { kind: 'dumbbells', count: 1 },
      });
    },
  },

  // ── 2. Standing Lower Body (Dumbbells) ─────────────────────────────────────
  squat: {
    id: 'squat',
    cameraPreset: 'three-quarter',
    computePose: (p) => {
      const pelvisY = lerp(0.85, 0.49, p);
      const pelvisZ = lerp(0, -0.22, p);
      const torsoForwardZ = lerp(0.02, 0.18, p);
      const chestY = pelvisY + Math.sqrt(Math.max(0.04, 0.46 ** 2 - torsoForwardZ ** 2));
      const handY = Math.max(0.28, chestY - 0.45);
      return buildStandingFrontPose({
        pelvisY,
        pelvisZ,
        torsoForwardZ,
        stanceHalfW: 0.21,
        leftHand: v3(0.28, handY, pelvisZ + torsoForwardZ + 0.08),
        rightHand: v3(-0.28, handY, pelvisZ + torsoForwardZ + 0.08),
        leftPole: v3(0.45, -0.2, -0.85),
        rightPole: v3(-0.45, -0.2, -0.85),
        leftDumbbellAxis: v3(0, 0, 1),
        rightDumbbellAxis: v3(0, 0, 1),
        cameraPreset: 'three-quarter',
        prop: { kind: 'dumbbells', count: 2 },
      });
    },
  },

  rdl: {
    id: 'rdl',
    cameraPreset: 'side',
    computePose: (p) => {
      const hipAngle = lerp(0.08, 1.32, p);
      const pelvis = v3(lerp(-0.02, -0.24, p), lerp(0.85, 0.78, p), 0);
      const chest = v3(
        pelvis.x + Math.sin(hipAngle) * RIG_DIMENSIONS.torsoLength,
        pelvis.y + Math.cos(hipAngle) * RIG_DIMENSIONS.torsoLength,
        0,
      );
      const head = v3(
        chest.x + Math.sin(hipAngle) * RIG_DIMENSIONS.neckHeadOffset,
        chest.y + Math.cos(hipAngle) * RIG_DIMENSIONS.neckHeadOffset,
        0,
      );
      const f = buildSideFrame(
        pelvis,
        chest,
        head,
        v3(Math.cos(hipAngle), -Math.sin(hipAngle) * 0.7, 0),
      );

      // Dumbbells track vertically close to thighs/shins.
      const handX = lerp(0.06, 0.14, p);
      const handY = Math.max(0.27, chest.y - 0.5);
      return {
        ...f,
        leftArm: makeArm(f.lShoulder, v3(handX, handY, -0.17), v3(-0.5, 0.2, -0.8), v3(0, 0, 1)),
        rightArm: makeArm(f.rShoulder, v3(handX, handY, 0.17), v3(-0.5, 0.2, 0.8), v3(0, 0, 1)),
        leftLeg: makeLeg(
          f.lHip,
          v3(0.0, RIG_DIMENSIONS.footSoleY, -0.13),
          v3(1, 0.08, 0),
          v3(1, 0, 0),
        ),
        rightLeg: makeLeg(
          f.rHip,
          v3(0.0, RIG_DIMENSIONS.footSoleY, 0.13),
          v3(1, 0.08, 0),
          v3(1, 0, 0),
        ),
        cameraPreset: 'side',
        prop: { kind: 'dumbbells', count: 2 },
      };
    },
  },

  'reverse-lunge': {
    id: 'reverse-lunge',
    cameraPreset: 'three-quarter',
    computePose: (p) => {
      const pelvis = v3(lerp(0.02, -0.08, p), lerp(0.85, 0.52, p), 0);
      const chest = v3(pelvis.x + lerp(0, 0.06, p), pelvis.y + 0.455, 0);
      const head = v3(chest.x + 0.02, chest.y + RIG_DIMENSIONS.neckHeadOffset, 0);
      const f = buildSideFrame(pelvis, chest, head, v3(1, 0, 0));

      const frontAnkle = v3(lerp(0.08, 0.3, p), RIG_DIMENSIONS.footSoleY, 0.12);
      const backAnkle = v3(lerp(-0.04, -0.52, p), lerp(RIG_DIMENSIONS.footSoleY, 0.1, p), -0.12);
      const handY = Math.max(0.24, chest.y - 0.48);

      return {
        ...f,
        leftArm: makeArm(
          f.lShoulder,
          v3(pelvis.x + 0.03, handY, -0.24),
          v3(-0.4, 0, -0.9),
          v3(1, 0, 0),
        ),
        rightArm: makeArm(
          f.rShoulder,
          v3(pelvis.x + 0.03, handY, 0.24),
          v3(-0.4, 0, 0.9),
          v3(1, 0, 0),
        ),
        leftLeg: makeLeg(f.lHip, backAnkle, v3(0.65, -0.75, 0), v3(0.6, -0.8, 0)),
        rightLeg: makeLeg(f.rHip, frontAnkle, v3(1, 0.2, 0), v3(1, 0, 0)),
        cameraPreset: 'three-quarter',
        prop: { kind: 'dumbbells', count: 2 },
      };
    },
  },
};
