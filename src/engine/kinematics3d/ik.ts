/**
 * Pure 3D vector math, analytical 2-bone IK solver, and standing/side rig builders.
 * Zero DOM, WebGL, or Three.js dependencies.
 */

import { lerp } from '../animations/math';
import {
  RIG_DIMENSIONS,
  type ArmPose3D,
  type CameraPresetId,
  type LegPose3D,
  type PropSpec3D,
  type RigPose3D,
  type Vec3,
} from './types';

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

export function makeArm(
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

export function makeLeg(hip: Vec3, ankleTarget: Vec3, kneePole: Vec3, toeDir: Vec3): LegPose3D {
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
export function buildStandingFrontPose(options: {
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
export function buildSideFrame(
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
