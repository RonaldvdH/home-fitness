/**
 * Pure 3D pose definitions for Phase 5 Pilates & Mobility animations.
 * Zero DOM, WebGL, or Three.js dependencies.
 */

import type { AnimationId } from '../../domain/schema';
import { lerp } from '../animations/math';
import { buildSideFrame, makeArm, makeLeg, v3 } from './ik';
import { RIG_DIMENSIONS, type Animation3DDefinition } from './types';

export const PILATES_MOBILITY_3D_ANIMATIONS: Partial<Record<AnimationId, Animation3DDefinition>> = {
  'pilates-hundred': {
    id: 'pilates-hundred',
    cameraPreset: 'floor-low',
    computePose: (p) => {
      const pelvis = v3(0.04, 0.095, 0);
      const chest = v3(-0.37, 0.24, 0);
      const head = v3(-0.54, 0.35, 0);
      const f = buildSideFrame(pelvis, chest, head, v3(0.35, 0.94, 0));
      const pumpY = lerp(0.16, 0.28, p);
      return {
        ...f,
        leftArm: makeArm(f.lShoulder, v3(0.08, pumpY, -0.22), v3(0, -1, -0.3)),
        rightArm: makeArm(f.rShoulder, v3(0.08, pumpY, 0.22), v3(0, -1, 0.3)),
        leftLeg: makeLeg(f.lHip, v3(0.68, 0.56, -0.1), v3(0, 1, 0), v3(1, 0.4, 0)),
        rightLeg: makeLeg(f.rHip, v3(0.68, 0.56, 0.1), v3(0, 1, 0), v3(1, 0.4, 0)),
        cameraPreset: 'floor-low',
        prop: { kind: 'none' },
      };
    },
  },

  'single-leg-stretch': {
    id: 'single-leg-stretch',
    cameraPreset: 'floor-low',
    computePose: (p) => {
      const pelvis = v3(0.04, 0.095, 0);
      const chest = v3(-0.37, 0.24, 0);
      const head = v3(-0.54, 0.35, 0);
      const f = buildSideFrame(pelvis, chest, head, v3(0.35, 0.94, 0));
      const lAnkle = v3(lerp(0.22, 0.74, p), lerp(0.34, 0.44, p), -0.11);
      const rAnkle = v3(lerp(0.74, 0.22, p), lerp(0.44, 0.34, p), 0.11);
      const handTarget = v3(lerp(0.12, 0.14, p), 0.36, 0);
      return {
        ...f,
        leftArm: makeArm(f.lShoulder, v3(handTarget.x, handTarget.y, -0.14), v3(0, -0.4, -1)),
        rightArm: makeArm(f.rShoulder, v3(handTarget.x, handTarget.y, 0.14), v3(0, -0.4, 1)),
        leftLeg: makeLeg(f.lHip, lAnkle, v3(-0.3, 1, 0), v3(1, 0.2, 0)),
        rightLeg: makeLeg(f.rHip, rAnkle, v3(-0.3, 1, 0), v3(1, 0.2, 0)),
        cameraPreset: 'floor-low',
        prop: { kind: 'none' },
      };
    },
  },

  'swan-prep': {
    id: 'swan-prep',
    cameraPreset: 'floor-low',
    computePose: (p) => {
      const pelvis = v3(-0.04, 0.095, 0);
      const chest = v3(lerp(0.42, 0.38, p), lerp(0.12, 0.34, p), 0);
      const head = v3(lerp(0.62, 0.56, p), lerp(0.16, 0.48, p), 0);
      const f = buildSideFrame(pelvis, chest, head, v3(-0.2, 0.98, 0));
      return {
        ...f,
        leftArm: makeArm(f.lShoulder, v3(0.36, 0.06, -0.24), v3(-0.4, 0.8, -0.4)),
        rightArm: makeArm(f.rShoulder, v3(0.36, 0.06, 0.24), v3(-0.4, 0.8, 0.4)),
        leftLeg: makeLeg(f.lHip, v3(-0.82, 0.07, -0.11), v3(0, 1, 0), v3(-1, 0, 0)),
        rightLeg: makeLeg(f.rHip, v3(-0.82, 0.07, 0.11), v3(0, 1, 0), v3(-1, 0, 0)),
        cameraPreset: 'floor-low',
        prop: { kind: 'none' },
      };
    },
  },

  'side-leg-lift': {
    id: 'side-leg-lift',
    cameraPreset: 'floor-three-quarter',
    computePose: (p) => {
      const pelvis = v3(0.02, 0.12, 0);
      const chest = v3(-0.44, 0.13, 0);
      const head = v3(-0.64, 0.16, 0);
      const f = buildSideFrame(pelvis, chest, head, v3(0, 0.15, 1));
      const topFootY = lerp(0.16, 0.62, p);
      return {
        ...f,
        leftArm: makeArm(f.lShoulder, v3(-0.58, 0.12, -0.06), v3(0, 0.2, -1)),
        rightArm: makeArm(f.rShoulder, v3(-0.22, 0.06, 0.22), v3(0.2, 0.8, 0.5)),
        leftLeg: makeLeg(f.lHip, v3(0.8, 0.08, -0.04), v3(0, 0, 1), v3(1, 0, 0)),
        rightLeg: makeLeg(
          f.rHip,
          v3(lerp(0.8, 0.72, p), topFootY, 0.04),
          v3(0, 0.3, 1),
          v3(1, 0, 0),
        ),
        cameraPreset: 'floor-three-quarter',
        prop: { kind: 'none' },
      };
    },
  },

  'spine-twist': {
    id: 'spine-twist',
    cameraPreset: 'front',
    computePose: (p) => {
      const angle = lerp(-0.55, 0.55, p);
      const pelvis = v3(0, 0.12, 0);
      const chest = v3(0, 0.58, 0);
      const head = v3(0, 0.78, 0);
      const sw = RIG_DIMENSIONS.shoulderHalfWidth;
      const hw = RIG_DIMENSIONS.hipHalfWidth;
      const lShoulder = v3(-Math.cos(angle) * sw, 0.58, Math.sin(angle) * sw);
      const rShoulder = v3(Math.cos(angle) * sw, 0.58, -Math.sin(angle) * sw);
      const armReach = 0.54;
      const lHand = v3(-Math.cos(angle) * armReach, 0.56, Math.sin(angle) * armReach);
      const rHand = v3(Math.cos(angle) * armReach, 0.56, -Math.sin(angle) * armReach);
      return {
        pelvis,
        chest,
        head,
        headForward: v3(Math.sin(angle), 0, Math.cos(angle)),
        leftArm: makeArm(lShoulder, lHand, v3(0, -0.2, -1)),
        rightArm: makeArm(rShoulder, rHand, v3(0, -0.2, -1)),
        leftLeg: makeLeg(v3(-hw, 0.12, 0), v3(-0.2, 0.08, 0.74), v3(0, 1, 0), v3(0, 0.4, 1)),
        rightLeg: makeLeg(v3(hw, 0.12, 0), v3(0.2, 0.08, 0.74), v3(0, 1, 0), v3(0, 0.4, 1)),
        cameraPreset: 'front',
        matAxis: 'z',
        prop: { kind: 'none' },
      };
    },
  },

  'clam-shell': {
    id: 'clam-shell',
    cameraPreset: 'floor-three-quarter',
    computePose: (p) => {
      const pelvis = v3(0.02, 0.12, 0);
      const chest = v3(-0.44, 0.13, 0);
      const head = v3(-0.64, 0.16, 0);
      const f = buildSideFrame(pelvis, chest, head, v3(0, 0.15, 1));
      const openPole = v3(0.1, lerp(0.15, 0.98, p), lerp(0.95, 0.25, p));
      return {
        ...f,
        leftArm: makeArm(f.lShoulder, v3(-0.58, 0.12, -0.06), v3(0, 0.2, -1)),
        rightArm: makeArm(f.rShoulder, v3(-0.22, 0.06, 0.22), v3(0.2, 0.8, 0.5)),
        leftLeg: makeLeg(f.lHip, v3(0.36, 0.08, -0.08), v3(0.2, 0.1, 1), v3(1, 0, 0)),
        rightLeg: makeLeg(f.rHip, v3(0.36, 0.11, -0.06), openPole, v3(1, 0, 0)),
        cameraPreset: 'floor-three-quarter',
        prop: { kind: 'band', mode: 'knees' },
      };
    },
  },

  swimming: {
    id: 'swimming',
    cameraPreset: 'floor-low',
    computePose: (p) => {
      const pelvis = v3(-0.04, 0.095, 0);
      const chest = v3(0.42, 0.14, 0);
      const head = v3(0.62, 0.2, 0);
      const f = buildSideFrame(pelvis, chest, head, v3(0, 1, 0));
      const lHandY = lerp(0.12, 0.3, p);
      const rHandY = lerp(0.3, 0.12, p);
      const lAnkleY = lerp(0.28, 0.1, p);
      const rAnkleY = lerp(0.1, 0.28, p);
      return {
        ...f,
        leftArm: makeArm(f.lShoulder, v3(0.92, lHandY, -0.16), v3(0, 0.4, -1)),
        rightArm: makeArm(f.rShoulder, v3(0.92, rHandY, 0.16), v3(0, 0.4, 1)),
        leftLeg: makeLeg(f.lHip, v3(-0.82, lAnkleY, -0.12), v3(0, 1, 0), v3(-1, 0, 0)),
        rightLeg: makeLeg(f.rHip, v3(-0.82, rAnkleY, 0.12), v3(0, 1, 0), v3(-1, 0, 0)),
        cameraPreset: 'floor-low',
        prop: { kind: 'none' },
      };
    },
  },

  'cat-cow': {
    id: 'cat-cow',
    cameraPreset: 'floor-low',
    computePose: (p) => {
      const pelvis = v3(-0.26, lerp(0.46, 0.54, p), 0);
      const chest = v3(0.2, lerp(0.48, 0.62, p), 0);
      const head = v3(0.38, lerp(0.58, 0.46, p), 0);
      const f = buildSideFrame(pelvis, chest, head, v3(0, 1, 0));
      return {
        ...f,
        leftArm: makeArm(f.lShoulder, v3(0.22, 0.05, -0.17), v3(-0.4, 0.2, -0.5)),
        rightArm: makeArm(f.rShoulder, v3(0.22, 0.05, 0.17), v3(-0.4, 0.2, 0.5)),
        leftLeg: makeLeg(f.lHip, v3(-0.56, 0.06, -0.14), v3(1, -0.2, 0), v3(-1, 0, 0)),
        rightLeg: makeLeg(f.rHip, v3(-0.56, 0.06, 0.14), v3(1, -0.2, 0), v3(-1, 0, 0)),
        cameraPreset: 'floor-low',
        prop: { kind: 'none' },
      };
    },
  },

  'worlds-greatest-stretch': {
    id: 'worlds-greatest-stretch',
    cameraPreset: 'floor-three-quarter',
    computePose: (p) => {
      const pelvis = v3(-0.08, 0.36, 0);
      const chest = v3(0.28, lerp(0.48, 0.56, p), 0);
      const head = v3(0.46, lerp(0.56, 0.68, p), 0);
      const f = buildSideFrame(pelvis, chest, head, v3(0, 1, 0));
      const reachHand = v3(lerp(0.28, 0.2, p), lerp(0.14, 1.04, p), lerp(0.16, 0.34, p));
      return {
        ...f,
        leftArm: makeArm(f.lShoulder, v3(0.24, 0.05, -0.16), v3(-0.3, 0.3, -0.6)),
        rightArm: makeArm(f.rShoulder, reachHand, v3(0, 0.3, 1)),
        leftLeg: makeLeg(
          f.lHip,
          v3(-0.74, RIG_DIMENSIONS.footSoleY, -0.14),
          v3(0.2, -0.8, 0),
          v3(1, 0, 0),
        ),
        rightLeg: makeLeg(
          f.rHip,
          v3(0.32, RIG_DIMENSIONS.footSoleY, 0.18),
          v3(0.5, 1, 0),
          v3(1, 0, 0),
        ),
        cameraPreset: 'floor-three-quarter',
        prop: { kind: 'none' },
      };
    },
  },

  'childs-pose': {
    id: 'childs-pose',
    cameraPreset: 'floor-low',
    computePose: (p) => {
      const pelvis = v3(-0.36, 0.28, 0);
      const chest = v3(0.08, lerp(0.22, 0.28, p), 0);
      const head = v3(0.26, lerp(0.16, 0.2, p), 0);
      const f = buildSideFrame(pelvis, chest, head, v3(0, 1, 0));
      return {
        ...f,
        leftArm: makeArm(f.lShoulder, v3(lerp(0.58, 0.64, p), 0.05, -0.18), v3(0, 0.5, -0.6)),
        rightArm: makeArm(f.rShoulder, v3(lerp(0.58, 0.64, p), 0.05, 0.18), v3(0, 0.5, 0.6)),
        leftLeg: makeLeg(f.lHip, v3(-0.34, 0.07, -0.14), v3(1, 0.2, 0), v3(-1, 0, 0)),
        rightLeg: makeLeg(f.rHip, v3(-0.34, 0.07, 0.14), v3(1, 0.2, 0), v3(-1, 0, 0)),
        cameraPreset: 'floor-low',
        prop: { kind: 'none' },
      };
    },
  },
};
