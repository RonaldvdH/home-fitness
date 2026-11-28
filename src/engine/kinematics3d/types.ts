/**
 * Shared 3D kinematics types, camera presets, and anatomical rig dimensions.
 * Zero DOM, WebGL, or Three.js dependencies.
 */

import type { AnimationId } from '../../domain/schema';

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
  /** Orientation of the gym mat's long axis ('x' by default, 'z' when facing/lying along Z). */
  matAxis?: 'x' | 'z';
  prop: PropSpec3D;
}

export interface Animation3DFrame {
  pose: RigPose3D;
  cue: string;
  cueIndex: 0 | 1 | 2 | 3;
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
