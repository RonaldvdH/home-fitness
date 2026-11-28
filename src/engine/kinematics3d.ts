/**
 * Pure 3D kinematics engine for the procedural mannequin demonstrator (Phase 4 / ADR-0002).
 * Zero DOM, WebGL, or Three.js dependencies so every animation pose, bone length,
 * floor clearance, and prop attachment can be unit-tested deterministically in Vitest.
 */

import { ANIMATION_IDS, type AnimationId } from '../domain/schema';
import { ANIMATION_REGISTRY, getSmoothCycle, lerp, smoothstep } from './animations';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type CameraPresetId =
  | 'front'
  | 'three-quarter'
  | 'side'
  | 'floor-low'
  | 'floor-three-quarter';

export interface CameraPresetConfig {
  /** Camera position in meters around the stage origin. */
  position: Vec3;
  /** Target look-at point in meters. */
  target: Vec3;
}

export const CAMERA_PRESETS: Record<CameraPresetId, CameraPresetConfig> = {
  front: {
    position: { x: 0.24, y: 1.24, z: 3.15 },
    target: { x: 0, y: 0.96, z: 0 },
  },
  'three-quarter': {
    position: { x: 1.98, y: 1.32, z: 2.76 },
    target: { x: 0, y: 0.86, z: 0 },
  },
  side: {
    position: { x: 0.22, y: 1.15, z: 2.95 },
    target: { x: 0, y: 0.88, z: 0 },
  },
  'floor-low': {
    position: { x: 0.15, y: 0.86, z: 2.52 },
    target: { x: 0, y: 0.34, z: 0 },
  },
  'floor-three-quarter': {
    position: { x: 1.42, y: 1.08, z: 2.25 },
    target: { x: 0, y: 0.38, z: 0 },
  },
};

export type PropSpec3D =
  | { kind: 'none' }
  | { kind: 'dumbbells'; count: 1 | 2 }
  | { kind: 'band'; mode: 'hands' | 'feet-to-hands' | 'ankles' }
  | { kind: 'foam-roller'; position: Vec3; axis: 'x' | 'z'; rollAngle: number }
  | { kind: 'wall'; center: Vec3; normal: Vec3 };

export interface ArmPose3D {
  shoulder: Vec3;
  elbow: Vec3;
  hand: Vec3;
  /** Unit axis describing the orientation of a held dumbbell bar in world space. */
  dumbbellAxis: Vec3;
}

export interface LegPose3D {
  hip: Vec3;
  knee: Vec3;
  ankle: Vec3;
  toe: Vec3;
}

export interface RigPose3D {
  pelvis: Vec3;
  chest: Vec3;
  head: Vec3;
  /** Unit forward direction the face/visor points toward. */
  headForward: Vec3;
  leftArm: ArmPose3D;
  rightArm: ArmPose3D;
  leftLeg: LegPose3D;
  rightLeg: LegPose3D;
  cameraPreset: CameraPresetId;
  prop: PropSpec3D;
}

export interface Animation3DFrame {
  pose: RigPose3D;
  cue: string;
  progress: number;
}

export interface Animation3DDefinition {
  id: AnimationId;
  cameraPreset: CameraPresetId;
  computePose: (progress: number, rawT: number) => RigPose3D;
}

// Anatomical constants (meters, Y-up, floor mat surface at y = 0).
export const RIG_DIMENSIONS = {
  torsoLength: 0.46,
  neckHeadOffset: 0.21,
  shoulderHalfWidth: 0.19,
  hipHalfWidth: 0.11,
  upperArm: 0.28,
  forearm: 0.26,
  thigh: 0.42,
  shin: 0.4,
  footLength: 0.16,
  footSoleY: 0.045,
  handFloorY: 0.045,
  rollerRadius: 0.075,
} as const;

export function v3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function add3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function sub3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale3(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function dot3(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross3(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function len3(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z);
}

export function dist3(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function normalize3(v: Vec3, fallback: Vec3 = { x: 0, y: 1, z: 0 }): Vec3 {
  const length = len3(v);
  if (length < 1e-6) return fallback;
  return { x: v.x / length, y: v.y / length, z: v.z / length };
}

export function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  };
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Pure analytical 2-bone 3D Inverse Kinematics solver (law of cosines).
 * Guarantees exact bone lengths (`len1`, `len2`) and smooth anatomical bends toward `poleDir`.
 */
export function solveTwoBoneIK(
  root: Vec3,
  target: Vec3,
  len1: number,
  len2: number,
  poleDir: Vec3,
): { mid: Vec3; end: Vec3 } {
  const toTarget = sub3(target, root);
  const rawDist = len3(toTarget);
  const minDist = Math.abs(len1 - len2) + 0.01;
  const maxDist = len1 + len2 - 0.008;
  const d = clamp(rawDist, minDist, maxDist);

  const dir = normalize3(toTarget, v3(0, -1, 0));

  // Project pole direction perpendicular to root -> target vector.
  const proj = dot3(poleDir, dir);
  let bend = sub3(poleDir, scale3(dir, proj));
  if (len3(bend) < 1e-4) {
    const fallbackAxis = Math.abs(dir.y) < 0.9 ? v3(0, 1, 0) : v3(0, 0, 1);
    bend = cross3(dir, fallbackAxis);
  }
  const bendDir = normalize3(bend, v3(0, 0, 1));

  const cosAngle = clamp((len1 * len1 + d * d - len2 * len2) / (2 * len1 * d), -1, 1);
  const along = len1 * cosAngle;
  const perp = Math.sqrt(Math.max(0, len1 * len1 - along * along));

  const mid = add3(add3(root, scale3(dir, along)), scale3(bendDir, perp));
  const end = add3(root, scale3(dir, d));
  return { mid, end };
}

function makeArm(
  shoulder: Vec3,
  handTarget: Vec3,
  elbowPole: Vec3,
  dumbbellAxis: Vec3 = v3(1, 0, 0),
): ArmPose3D {
  const { mid, end } = solveTwoBoneIK(
    shoulder,
    handTarget,
    RIG_DIMENSIONS.upperArm,
    RIG_DIMENSIONS.forearm,
    elbowPole,
  );
  return {
    shoulder,
    elbow: mid,
    hand: end,
    dumbbellAxis: normalize3(dumbbellAxis, v3(1, 0, 0)),
  };
}

function makeLeg(hip: Vec3, ankleTarget: Vec3, kneePole: Vec3, toeDir: Vec3): LegPose3D {
  const { mid, end } = solveTwoBoneIK(
    hip,
    ankleTarget,
    RIG_DIMENSIONS.thigh,
    RIG_DIMENSIONS.shin,
    kneePole,
  );
  const unitToe = normalize3(toeDir, v3(0, 0, 1));
  const toe = add3(end, scale3(unitToe, RIG_DIMENSIONS.footLength));
  // Never let toes clip beneath floor plane.
  return {
    hip,
    knee: mid,
    ankle: end,
    toe: { x: toe.x, y: Math.max(0.02, toe.y), z: toe.z },
  };
}

/**
 * Helper to construct a balanced standing pose facing +Z with customizable arms, stance, and lean.
 */
function buildStandingFrontPose(options: {
  pelvisY?: number;
  pelvisZ?: number;
  torsoForwardZ?: number;
  stanceHalfW?: number;
  leftHand: Vec3;
  rightHand: Vec3;
  leftPole: Vec3;
  rightPole: Vec3;
  leftDumbbellAxis?: Vec3;
  rightDumbbellAxis?: Vec3;
  cameraPreset: CameraPresetId;
  prop: PropSpec3D;
}): RigPose3D {
  const pelvisY = options.pelvisY ?? 0.85;
  const pelvisZ = options.pelvisZ ?? 0;
  const torsoForwardZ = options.torsoForwardZ ?? 0;
  const stanceHalfW = options.stanceHalfW ?? 0.16;

  const pelvis = v3(0, pelvisY, pelvisZ);
  const chest = v3(
    0,
    pelvisY + Math.sqrt(Math.max(0.04, RIG_DIMENSIONS.torsoLength ** 2 - torsoForwardZ ** 2)),
    pelvisZ + torsoForwardZ,
  );
  const head = v3(0, chest.y + RIG_DIMENSIONS.neckHeadOffset, chest.z + torsoForwardZ * 0.2);

  const lShoulder = v3(RIG_DIMENSIONS.shoulderHalfWidth, chest.y - 0.02, chest.z);
  const rShoulder = v3(-RIG_DIMENSIONS.shoulderHalfWidth, chest.y - 0.02, chest.z);
  const lHip = v3(RIG_DIMENSIONS.hipHalfWidth, pelvis.y - 0.02, pelvis.z);
  const rHip = v3(-RIG_DIMENSIONS.hipHalfWidth, pelvis.y - 0.02, pelvis.z);

  const lAnkle = v3(stanceHalfW, RIG_DIMENSIONS.footSoleY, 0.02);
  const rAnkle = v3(-stanceHalfW, RIG_DIMENSIONS.footSoleY, 0.02);

  return {
    pelvis,
    chest,
    head,
    headForward: v3(0, 0, 1),
    leftArm: makeArm(lShoulder, options.leftHand, options.leftPole, options.leftDumbbellAxis),
    rightArm: makeArm(rShoulder, options.rightHand, options.rightPole, options.rightDumbbellAxis),
    leftLeg: makeLeg(lHip, lAnkle, v3(0.25, 0, 1), v3(0.18, 0, 0.98)),
    rightLeg: makeLeg(rHip, rAnkle, v3(-0.25, 0, 1), v3(-0.18, 0, 0.98)),
    cameraPreset: options.cameraPreset,
    prop: options.prop,
  };
}

/**
 * Helper to construct a standing side-facing pose (athlete facing +X, viewed from +Z / 3/4).
 * Left side is at -Z (farther from viewer), right side is at +Z (closer to viewer).
 */
function buildSideFrame(
  pelvis: Vec3,
  chest: Vec3,
  head: Vec3,
  headForward: Vec3,
): {
  lShoulder: Vec3;
  rShoulder: Vec3;
  lHip: Vec3;
  rHip: Vec3;
  pelvis: Vec3;
  chest: Vec3;
  head: Vec3;
  headForward: Vec3;
} {
  return {
    pelvis,
    chest,
    head,
    headForward: normalize3(headForward, v3(1, 0, 0)),
    lShoulder: v3(chest.x, chest.y - 0.01, chest.z - RIG_DIMENSIONS.shoulderHalfWidth),
    rShoulder: v3(chest.x, chest.y - 0.01, chest.z + RIG_DIMENSIONS.shoulderHalfWidth),
    lHip: v3(pelvis.x, pelvis.y - 0.01, pelvis.z - RIG_DIMENSIONS.hipHalfWidth),
    rHip: v3(pelvis.x, pelvis.y - 0.01, pelvis.z + RIG_DIMENSIONS.hipHalfWidth),
  };
}

/**
 * Collect all anatomical joint positions from a `RigPose3D` for validation and bounds checks.
 */
export function collectJointPositions(pose: RigPose3D): Record<string, Vec3> {
  return {
    pelvis: pose.pelvis,
    chest: pose.chest,
    head: pose.head,
    leftShoulder: pose.leftArm.shoulder,
    leftElbow: pose.leftArm.elbow,
    leftHand: pose.leftArm.hand,
    rightShoulder: pose.rightArm.shoulder,
    rightElbow: pose.rightArm.elbow,
    rightHand: pose.rightArm.hand,
    leftHip: pose.leftLeg.hip,
    leftKnee: pose.leftLeg.knee,
    leftAnkle: pose.leftLeg.ankle,
    leftToe: pose.leftLeg.toe,
    rightHip: pose.rightLeg.hip,
    rightKnee: pose.rightLeg.knee,
    rightAnkle: pose.rightLeg.ankle,
    rightToe: pose.rightLeg.toe,
  };
}

export const ANIMATION_3D_REGISTRY: Record<AnimationId, Animation3DDefinition> = {
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
      // True 3D forearm supination: bottom neutral hammer grip (axis Z) -> top palms-up (axis X).
      const supination = smoothstep(0.12, 0.82, p);
      const angle = supination * (Math.PI / 2);
      const lAxis = v3(Math.sin(angle), 0, Math.cos(angle));
      const rAxis = v3(Math.sin(angle), 0, Math.cos(angle));

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

      return buildStandingFrontPose({
        leftHand: lHand,
        rightHand: rHand,
        leftPole: v3(0.25, -0.65, -0.7),
        rightPole: v3(-0.25, -0.65, -0.7),
        leftDumbbellAxis: lAxis,
        rightDumbbellAxis: rAxis,
        cameraPreset: 'three-quarter',
        prop: { kind: 'dumbbells', count: 2 },
      });
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

  // ── 3. Floor Supine / Seated Core & Pressing ───────────────────────────────
  'floor-press': {
    id: 'floor-press',
    cameraPreset: 'floor-three-quarter',
    computePose: (p) => {
      const pelvis = v3(0.05, 0.13, 0);
      const chest = v3(-0.41, 0.14, 0);
      const head = v3(-0.61, 0.15, 0);
      const f = buildSideFrame(pelvis, chest, head, v3(0, 1, 0));

      const handY = lerp(0.36, 0.63, p);
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
      const chest = v3(-0.4, 0.14, 0);
      const pelvis = v3(lerp(0.06, 0.04, p), lerp(0.13, 0.4, p), 0);
      const head = v3(-0.6, 0.14, 0);
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
      const curlAngle = lerp(0.06, 0.72, p);
      const pelvis = v3(0.06, 0.13, 0);
      const chest = v3(
        pelvis.x - Math.cos(curlAngle) * RIG_DIMENSIONS.torsoLength,
        pelvis.y + Math.sin(curlAngle) * RIG_DIMENSIONS.torsoLength,
        0,
      );
      const head = v3(
        chest.x - Math.cos(curlAngle + 0.35) * RIG_DIMENSIONS.neckHeadOffset,
        chest.y + Math.sin(curlAngle + 0.35) * RIG_DIMENSIONS.neckHeadOffset,
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
      const pelvis = v3(-0.08, 0.13, 0);
      const chest = v3(-0.54, 0.14, 0);
      const head = v3(-0.74, 0.15, 0);
      const f = buildSideFrame(pelvis, chest, head, v3(0, 1, 0));

      const liftAngle = lerp(0.12, 1.46, p);
      const legReach = 0.8;
      const ankleX = pelvis.x + Math.cos(liftAngle) * legReach;
      const ankleY = Math.max(0.11, pelvis.y + Math.sin(liftAngle) * legReach);
      const toeDir = v3(-Math.sin(liftAngle) * 0.4, Math.cos(liftAngle), 0);

      return {
        ...f,
        leftArm: makeArm(f.lShoulder, v3(-0.05, 0.07, -0.22), v3(0, -1, -0.3)),
        rightArm: makeArm(f.rShoulder, v3(-0.05, 0.07, 0.22), v3(0, -1, 0.3)),
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
      // Seated V-sit with genuine 3D torso rotation from right (-X) to left (+X).
      const twist = lerp(-0.85, 0.85, p);
      const pelvis = v3(0, 0.14, -0.05);
      const chest = v3(0, 0.47, -0.36);
      const head = v3(0, 0.66, -0.42);

      const cosT = Math.cos(twist);
      const sinT = Math.sin(twist);
      const shW = RIG_DIMENSIONS.shoulderHalfWidth;
      const lShoulder = v3(chest.x + shW * cosT, chest.y - 0.02, chest.z + shW * sinT);
      const rShoulder = v3(chest.x - shW * cosT, chest.y - 0.02, chest.z - shW * sinT);

      // Both hands carry a single dumbbell clearly in front of chest, swinging cleanly side to side.
      const dbCenter = v3(Math.sin(twist) * 0.39, 0.38, 0.02 + Math.cos(twist) * 0.13);
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
          v3(0.11, 0.14, -0.02),
          v3(0.14, 0.24, 0.56),
          v3(0.1, 1, 0),
          v3(0, 0.7, 0.7),
        ),
        rightLeg: makeLeg(
          v3(-0.11, 0.14, -0.02),
          v3(-0.14, 0.24, 0.56),
          v3(-0.1, 1, 0),
          v3(0, 0.7, 0.7),
        ),
        cameraPreset: 'floor-three-quarter',
        prop: { kind: 'dumbbells', count: 1 },
      };
    },
  },

  'dead-bug': {
    id: 'dead-bug',
    cameraPreset: 'floor-low',
    computePose: (p) => {
      const pelvis = v3(0.06, 0.13, 0);
      const chest = v3(-0.4, 0.14, 0);
      const head = v3(-0.6, 0.15, 0);
      const f = buildSideFrame(pelvis, chest, head, v3(0, 1, 0));

      // Right arm reaches overhead (-X) while left leg extends forward (+X); left arm + right leg hold tabletop.
      const rHand = v3(lerp(-0.38, -0.84, p), lerp(0.64, 0.22, p), 0.18);
      const lHand = v3(-0.38, 0.64, -0.18);

      const lAnkle = v3(lerp(0.42, 0.84, p), lerp(0.46, 0.16, p), -0.12);
      const rAnkle = v3(0.42, 0.46, 0.12);

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
        leftLeg: makeLeg(f.lHip, v3(0.86, 0.08, -0.16), v3(0, 0.5, -0.2), v3(-0.2, -0.98, 0)),
        rightLeg: makeLeg(f.rHip, v3(0.86, 0.08, 0.16), v3(0, 0.5, 0.2), v3(-0.2, -0.98, 0)),
        cameraPreset: 'floor-three-quarter',
        prop: { kind: 'none' },
      };
    },
  },

  'push-up': {
    id: 'push-up',
    cameraPreset: 'floor-three-quarter',
    computePose: (p) => {
      const chestY = lerp(0.54, 0.22, p);
      const pelvisY = lerp(0.42, 0.18, p);
      const chest = v3(-0.32, chestY, 0);
      const pelvis = v3(0.13, pelvisY, 0);
      const head = v3(-0.52, chestY + 0.05, 0);
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
        leftLeg: makeLeg(f.lHip, v3(0.86, 0.08, -0.13), v3(0, 0.5, 0), v3(-0.2, -0.98, 0)),
        rightLeg: makeLeg(f.rHip, v3(0.86, 0.08, 0.13), v3(0, 0.5, 0), v3(-0.2, -0.98, 0)),
        cameraPreset: 'floor-three-quarter',
        prop: { kind: 'none' },
      };
    },
  },

  'bird-dog': {
    id: 'bird-dog',
    cameraPreset: 'floor-three-quarter',
    computePose: (p) => {
      const chest = v3(-0.22, 0.52, 0);
      const pelvis = v3(0.24, 0.51, 0);
      const head = v3(-0.42, 0.57, 0);
      const f = buildSideFrame(pelvis, chest, head, v3(-0.5, -0.85, 0));

      // Right arm reaches forward (-X), left leg extends straight back (+X).
      const rHand = lerp3(v3(-0.22, RIG_DIMENSIONS.handFloorY, 0.18), v3(-0.74, 0.56, 0.16), p);
      const lAnkle = lerp3(v3(0.56, 0.07, -0.12), v3(1.02, 0.54, -0.11), p);

      return {
        ...f,
        leftArm: makeArm(
          f.lShoulder,
          v3(-0.22, RIG_DIMENSIONS.handFloorY, -0.18),
          v3(0.5, 0, -0.8),
        ),
        rightArm: makeArm(f.rShoulder, rHand, v3(0.2, -0.9, 0.4)),
        leftLeg: makeLeg(f.lHip, lAnkle, v3(-0.2, -0.95, 0), v3(0.95, -0.25, 0)),
        rightLeg: makeLeg(f.rHip, v3(0.56, 0.07, 0.12), v3(-0.25, -0.95, 0), v3(1, 0, 0)),
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
      const pelvis = v3(0.08, 0.12, 0);
      const chest = v3(-0.37, 0.14 + lift, 0);
      const head = v3(-0.56, 0.17 + lift * 1.35, 0);
      const f = buildSideFrame(pelvis, chest, head, v3(-0.8, -0.5, 0));

      const handY = Math.max(0.08, 0.12 + lift * 1.9);
      const ankleY = Math.max(0.08, 0.1 + lift * 1.5);
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

  'band-kickback': {
    id: 'band-kickback',
    cameraPreset: 'floor-three-quarter',
    computePose: (p) => {
      const chest = v3(-0.22, 0.52, 0);
      const pelvis = v3(0.24, 0.51, 0);
      const head = v3(-0.42, 0.57, 0);
      const f = buildSideFrame(pelvis, chest, head, v3(-0.4, -0.9, 0));

      // Right leg presses heel straight back against ankle band.
      const rAnkle = lerp3(v3(0.56, 0.08, 0.12), v3(1.0, 0.62, 0.12), p);
      return {
        ...f,
        leftArm: makeArm(
          f.lShoulder,
          v3(-0.22, RIG_DIMENSIONS.handFloorY, -0.18),
          v3(0.5, 0, -0.8),
        ),
        rightArm: makeArm(f.rShoulder, v3(-0.22, RIG_DIMENSIONS.handFloorY, 0.18), v3(0.5, 0, 0.8)),
        leftLeg: makeLeg(f.lHip, v3(0.56, 0.08, -0.12), v3(-0.25, -0.95, 0), v3(1, 0, 0)),
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
      const pelvis = v3(0.14, 0.13, 0);
      const chest = v3(rollerX - 0.1, rollerR * 2 + 0.07 + Math.sin(extAngle) * 0.16, 0);
      const head = v3(
        chest.x - Math.cos(extAngle) * RIG_DIMENSIONS.neckHeadOffset,
        Math.max(0.14, chest.y + Math.sin(extAngle) * RIG_DIMENSIONS.neckHeadOffset),
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
      const chest = v3(-0.34 + shift, 0.33, 0);
      const pelvis = v3(0.11 + shift, 0.25, 0);
      const head = v3(-0.52 + shift, 0.37, 0);
      const f = buildSideFrame(pelvis, chest, head, v3(-0.5, -0.85, 0));

      return {
        ...f,
        leftArm: makeArm(f.lShoulder, v3(-0.5 + shift, 0.06, -0.16), v3(0.2, -1, -0.2)),
        rightArm: makeArm(f.rShoulder, v3(-0.5 + shift, 0.06, 0.16), v3(0.2, -1, 0.2)),
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

/**
 * Evaluate a single 3D animation frame for normalized cycle time `rawT` in `[0, 1)`.
 * Shares `getSmoothCycle` and cue strings with `src/engine/animations.ts` so 2D & 3D stay in sync.
 */
export function computeAnimation3DFrame(animationId: AnimationId, rawT: number): Animation3DFrame {
  const clampedT = ((rawT % 1) + 1) % 1;
  const def3d = ANIMATION_3D_REGISTRY[animationId] ?? ANIMATION_3D_REGISTRY['overhead-press'];
  const def2d = ANIMATION_REGISTRY[animationId] ?? ANIMATION_REGISTRY['overhead-press'];
  const progress = getSmoothCycle(clampedT);
  const pose = def3d.computePose(progress, clampedT);

  let cue: string;
  if (clampedT < 0.45) {
    cue = def2d.cues[0];
  } else if (clampedT < 0.55) {
    cue = def2d.cues[1];
  } else if (clampedT < 0.95) {
    cue = def2d.cues[2];
  } else {
    cue = def2d.cues[3];
  }

  return { pose, cue, progress };
}

export const ALL_3D_ANIMATION_IDS: readonly AnimationId[] = ANIMATION_IDS;
