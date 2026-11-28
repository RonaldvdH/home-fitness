/**
 * Pure 3D pose definitions for elastic bands, wall, and foam-roller exercises.
 */

import type { AnimationId } from '../../domain/schema';
import { lerp } from '../animations/math';
import { buildSideFrame, buildStandingFrontPose, lerp3, makeArm, makeLeg, v3 } from './ik';
import { RIG_DIMENSIONS, type Animation3DDefinition } from './types';

export const PROPS_3D_ANIMATIONS: Partial<Record<AnimationId, Animation3DDefinition>> = {
  // ── 5. Elastic Resistance Bands ────────────────────────────────────────────
  'band-pull-apart': {
    id: 'band-pull-apart',
    cameraPreset: 'front',
    computePose: (p) => {
      const spreadX = lerp(0.18, 0.64, p);
      const handZ = lerp(0.49, 0.22, p);
      return buildStandingFrontPose({
        leftHand: v3(spreadX, 1.28, handZ),
        rightHand: v3(-spreadX, 1.28, handZ),
        leftPole: v3(0.4, -0.35, -0.85),
        rightPole: v3(-0.4, -0.35, -0.85),
        cameraPreset: 'front',
        prop: { kind: 'band', mode: 'hands' },
      });
    },
  },

  'band-row': {
    id: 'band-row',
    cameraPreset: 'three-quarter',
    computePose: (p) => {
      const pelvis = v3(-0.16, 0.8, 0);
      const chest = v3(0.24, 1.03, 0);
      const head = v3(0.41, 1.15, 0);
      const f = buildSideFrame(pelvis, chest, head, v3(0.85, -0.45, 0));

      const lHand = v3(lerp(0.2, -0.02, p), lerp(0.56, 0.86, p), -0.22);
      const rHand = v3(lerp(0.2, -0.02, p), lerp(0.56, 0.86, p), 0.22);
      return {
        ...f,
        leftArm: makeArm(f.lShoulder, lHand, v3(-0.75, 0.65, -0.25)),
        rightArm: makeArm(f.rShoulder, rHand, v3(-0.75, 0.65, 0.25)),
        leftLeg: makeLeg(
          f.lHip,
          v3(0.02, RIG_DIMENSIONS.footSoleY, -0.14),
          v3(1, 0.1, 0),
          v3(1, 0, 0),
        ),
        rightLeg: makeLeg(
          f.rHip,
          v3(0.02, RIG_DIMENSIONS.footSoleY, 0.14),
          v3(1, 0.1, 0),
          v3(1, 0, 0),
        ),
        cameraPreset: 'three-quarter',
        prop: { kind: 'band', mode: 'feet-to-hands' },
      };
    },
  },

  'band-bicep-curl': {
    id: 'band-bicep-curl',
    cameraPreset: 'three-quarter',
    computePose: (p) => {
      const curlTheta = lerp(0.12, 2.34, p);
      const elbowY = 1.01;
      const elbowZ = lerp(0.01, 0.08, p);
      const forearmLen = RIG_DIMENSIONS.forearm;

      const lHand = v3(
        lerp(0.24, 0.21, p),
        elbowY - Math.cos(curlTheta) * forearmLen,
        elbowZ + Math.sin(curlTheta) * forearmLen,
      );
      const rHand = v3(
        lerp(-0.24, -0.21, p),
        elbowY - Math.cos(curlTheta) * forearmLen,
        elbowZ + Math.sin(curlTheta) * forearmLen,
      );

      return buildStandingFrontPose({
        stanceHalfW: 0.2,
        leftHand: lHand,
        rightHand: rHand,
        leftPole: v3(0.25, -0.65, -0.7),
        rightPole: v3(-0.25, -0.65, -0.7),
        cameraPreset: 'three-quarter',
        prop: { kind: 'band', mode: 'feet-to-hands' },
      });
    },
  },

  'band-kickback': {
    id: 'band-kickback',
    cameraPreset: 'floor-three-quarter',
    computePose: (p) => {
      const chest = v3(-0.22, 0.48, 0);
      const pelvis = v3(0.24, 0.47, 0);
      const head = v3(-0.42, 0.53, 0);
      const f = buildSideFrame(pelvis, chest, head, v3(-0.4, -0.9, 0));

      // Right leg presses heel straight back against ankle band.
      const rAnkle = lerp3(v3(0.56, RIG_DIMENSIONS.footSoleY, 0.12), v3(1.0, 0.58, 0.12), p);
      return {
        ...f,
        leftArm: makeArm(
          f.lShoulder,
          v3(-0.22, RIG_DIMENSIONS.handFloorY, -0.18),
          v3(0.5, 0, -0.8),
        ),
        rightArm: makeArm(f.rShoulder, v3(-0.22, RIG_DIMENSIONS.handFloorY, 0.18), v3(0.5, 0, 0.8)),
        leftLeg: makeLeg(
          f.lHip,
          v3(0.56, RIG_DIMENSIONS.footSoleY, -0.12),
          v3(-0.25, -0.95, 0),
          v3(1, 0, 0),
        ),
        rightLeg: makeLeg(f.rHip, rAnkle, v3(-0.15, -0.95, 0), v3(0.15, -0.98, 0)),
        cameraPreset: 'floor-three-quarter',
        prop: { kind: 'band', mode: 'ankles' },
      };
    },
  },

  // ── 6. Wall Exercises ──────────────────────────────────────────────────────
  'wall-sit': {
    id: 'wall-sit',
    cameraPreset: 'three-quarter',
    computePose: (p) => {
      const micro = Math.sin(p * Math.PI) * 0.014;
      const wallX = -0.34;
      const pelvis = v3(wallX + 0.11, 0.47 + micro, 0);
      const chest = v3(wallX + 0.1, 0.93 + micro, 0);
      const head = v3(wallX + 0.12, 1.14 + micro, 0);
      const f = buildSideFrame(pelvis, chest, head, v3(1, 0, 0));

      return {
        ...f,
        leftArm: makeArm(f.lShoulder, v3(0.18, 0.84 + micro, -0.16), v3(0, -1, -0.3)),
        rightArm: makeArm(f.rShoulder, v3(0.18, 0.84 + micro, 0.16), v3(0, -1, 0.3)),
        leftLeg: makeLeg(
          f.lHip,
          v3(0.24, RIG_DIMENSIONS.footSoleY, -0.16),
          v3(1, 0.25, 0),
          v3(1, 0, 0),
        ),
        rightLeg: makeLeg(
          f.rHip,
          v3(0.24, RIG_DIMENSIONS.footSoleY, 0.16),
          v3(1, 0.25, 0),
          v3(1, 0, 0),
        ),
        cameraPreset: 'three-quarter',
        prop: { kind: 'wall', center: v3(wallX, 0.95, 0), normal: v3(1, 0, 0) },
      };
    },
  },

  'wall-pushup': {
    id: 'wall-pushup',
    cameraPreset: 'three-quarter',
    computePose: (p) => {
      const wallX = 0.56;
      const lean = lerp(0.28, 0.62, p);
      const footX = -0.34;
      const pelvis = v3(
        footX + Math.sin(lean) * 0.82,
        RIG_DIMENSIONS.footSoleY + Math.cos(lean) * 0.82,
        0,
      );
      const chest = v3(
        pelvis.x + Math.sin(lean) * RIG_DIMENSIONS.torsoLength,
        pelvis.y + Math.cos(lean) * RIG_DIMENSIONS.torsoLength,
        0,
      );
      const head = v3(
        chest.x + Math.sin(lean) * RIG_DIMENSIONS.neckHeadOffset,
        chest.y + Math.cos(lean) * RIG_DIMENSIONS.neckHeadOffset,
        0,
      );
      const f = buildSideFrame(pelvis, chest, head, v3(1, -0.1, 0));

      return {
        ...f,
        leftArm: makeArm(f.lShoulder, v3(wallX - 0.03, 1.22, -0.22), v3(-0.4, -0.5, -0.8)),
        rightArm: makeArm(f.rShoulder, v3(wallX - 0.03, 1.22, 0.22), v3(-0.4, -0.5, 0.8)),
        leftLeg: makeLeg(
          f.lHip,
          v3(footX, RIG_DIMENSIONS.footSoleY, -0.14),
          v3(1, 0, 0),
          v3(1, 0, 0),
        ),
        rightLeg: makeLeg(
          f.rHip,
          v3(footX, RIG_DIMENSIONS.footSoleY, 0.14),
          v3(1, 0, 0),
          v3(1, 0, 0),
        ),
        cameraPreset: 'three-quarter',
        prop: { kind: 'wall', center: v3(wallX, 0.95, 0), normal: v3(-1, 0, 0) },
      };
    },
  },

  'wall-angels': {
    id: 'wall-angels',
    cameraPreset: 'front',
    computePose: (p) => {
      const wallZ = -0.16;
      const handX = lerp(0.45, 0.34, p);
      const handY = lerp(1.36, 1.76, p);
      return buildStandingFrontPose({
        pelvisY: 0.83,
        pelvisZ: wallZ + 0.11,
        stanceHalfW: 0.17,
        leftHand: v3(handX, handY, wallZ + 0.06),
        rightHand: v3(-handX, handY, wallZ + 0.06),
        leftPole: v3(0.85, -0.55, -0.15),
        rightPole: v3(-0.85, -0.55, -0.15),
        cameraPreset: 'front',
        prop: { kind: 'wall', center: v3(0, 0.95, wallZ), normal: v3(0, 0, 1) },
      });
    },
  },

  // ── 7. Foam Roller Mobility & Recovery ─────────────────────────────────────
  'roller-thoracic': {
    id: 'roller-thoracic',
    cameraPreset: 'floor-three-quarter',
    computePose: (p) => {
      const rollerX = -0.22;
      const rollerR = RIG_DIMENSIONS.rollerRadius;
      const extAngle = lerp(0.32, -0.2, p);
      const pelvis = v3(0.14, 0.09, 0);
      const chest = v3(rollerX - 0.1, rollerR * 2 + 0.07 + Math.sin(extAngle) * 0.16, 0);
      const head = v3(
        chest.x - Math.cos(extAngle) * RIG_DIMENSIONS.neckHeadOffset,
        Math.max(0.11, chest.y + Math.sin(extAngle) * RIG_DIMENSIONS.neckHeadOffset),
        0,
      );
      const f = buildSideFrame(pelvis, chest, head, v3(Math.sin(extAngle + 0.35), 0.95, 0));

      return {
        ...f,
        leftArm: makeArm(f.lShoulder, v3(head.x + 0.04, head.y + 0.02, -0.13), v3(0.2, 0.5, -0.8)),
        rightArm: makeArm(f.rShoulder, v3(head.x + 0.04, head.y + 0.02, 0.13), v3(0.2, 0.5, 0.8)),
        leftLeg: makeLeg(
          f.lHip,
          v3(0.62, RIG_DIMENSIONS.footSoleY, -0.15),
          v3(0, 1, 0),
          v3(1, 0, 0),
        ),
        rightLeg: makeLeg(
          f.rHip,
          v3(0.62, RIG_DIMENSIONS.footSoleY, 0.15),
          v3(0, 1, 0),
          v3(1, 0, 0),
        ),
        cameraPreset: 'floor-three-quarter',
        prop: {
          kind: 'foam-roller',
          position: v3(rollerX, rollerR, 0),
          axis: 'z',
          rollAngle: p * 1.1,
        },
      };
    },
  },

  'roller-quad': {
    id: 'roller-quad',
    cameraPreset: 'floor-low',
    computePose: (p) => {
      const shift = lerp(-0.16, 0.16, p);
      const rollerR = RIG_DIMENSIONS.rollerRadius;
      const chest = v3(-0.34 + shift, 0.31, 0);
      const pelvis = v3(0.11 + shift, 0.23, 0);
      const head = v3(-0.52 + shift, 0.35, 0);
      const f = buildSideFrame(pelvis, chest, head, v3(-0.5, -0.85, 0));

      return {
        ...f,
        leftArm: makeArm(
          f.lShoulder,
          v3(-0.5 + shift, RIG_DIMENSIONS.handFloorY, -0.16),
          v3(0.2, -1, -0.2),
        ),
        rightArm: makeArm(
          f.rShoulder,
          v3(-0.5 + shift, RIG_DIMENSIONS.handFloorY, 0.16),
          v3(0.2, -1, 0.2),
        ),
        leftLeg: makeLeg(f.lHip, v3(0.86 + shift, 0.14, -0.13), v3(0, -1, 0), v3(0.4, -0.9, 0)),
        rightLeg: makeLeg(f.rHip, v3(0.86 + shift, 0.14, 0.13), v3(0, -1, 0), v3(0.4, -0.9, 0)),
        cameraPreset: 'floor-low',
        prop: {
          kind: 'foam-roller',
          position: v3(0.32, rollerR, 0),
          axis: 'z',
          rollAngle: -shift / rollerR,
        },
      };
    },
  },

  'roller-glute': {
    id: 'roller-glute',
    cameraPreset: 'floor-three-quarter',
    computePose: (p) => {
      const shift = lerp(-0.12, 0.12, p);
      const rollerR = RIG_DIMENSIONS.rollerRadius;
      const pelvis = v3(0.02 + shift, rollerR * 2 + 0.08, 0);
      const chest = v3(-0.2 + shift, pelvis.y + 0.4, 0);
      const head = v3(-0.28 + shift, chest.y + 0.19, 0);
      const f = buildSideFrame(pelvis, chest, head, v3(0.95, -0.2, 0));

      return {
        ...f,
        leftArm: makeArm(
          f.lShoulder,
          v3(-0.34 + shift, RIG_DIMENSIONS.handFloorY, -0.18),
          v3(-0.5, 0.2, -0.8),
        ),
        rightArm: makeArm(
          f.rShoulder,
          v3(-0.34 + shift, RIG_DIMENSIONS.handFloorY, 0.18),
          v3(-0.5, 0.2, 0.8),
        ),
        leftLeg: makeLeg(
          f.lHip,
          v3(0.5 + shift, RIG_DIMENSIONS.footSoleY, -0.14),
          v3(0.1, 1, 0),
          v3(1, 0, 0),
        ),
        // Right ankle crosses slightly up for figure-4 glute stretch on roller.
        rightLeg: makeLeg(f.rHip, v3(0.34 + shift, 0.42, 0.04), v3(0.2, 0.7, 0.7), v3(0.5, 0.8, 0)),
        cameraPreset: 'floor-three-quarter',
        prop: {
          kind: 'foam-roller',
          position: v3(0.02, rollerR, 0),
          axis: 'z',
          rollAngle: shift / rollerR,
        },
      };
    },
  },
};
