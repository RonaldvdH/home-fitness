/**
 * Pure 3D kinematics engine entrypoint (Phase 4 / ADR-0002).
 * Zero DOM, WebGL, or Three.js dependencies.
 */

import { ANIMATION_IDS, type AnimationId } from '../../domain/schema';
import { ANIMATION_REGISTRY, getCueIndex, getSmoothCycle } from '../animations';
import { buildMotionGuidePaths3D } from './motionGuides';
import { FLOOR_CORE_3D_ANIMATIONS } from './posesFloorCore';
import { PILATES_MOBILITY_3D_ANIMATIONS } from './posesPilatesMobility';
import { PROPS_3D_ANIMATIONS } from './posesProps';
import { UPPER_LOWER_3D_ANIMATIONS } from './posesUpperLower';
import type { Animation3DDefinition, Animation3DFrame, Vec3 } from './types';

export {
  add3,
  collectJointPositions,
  cross3,
  dist3,
  dot3,
  len3,
  lerp3,
  normalize3,
  scale3,
  solveTwoBoneIK,
  sub3,
  v3,
} from './ik';
export { type MotionGuideJoint } from './motionGuides';
export {
  CAMERA_PRESETS,
  RIG_DIMENSIONS,
  type Animation3DDefinition,
  type Animation3DFrame,
  type ArmPose3D,
  type CameraPresetConfig,
  type CameraPresetId,
  type LegPose3D,
  type PropSpec3D,
  type RigPose3D,
  type Vec3,
} from './types';

export const ANIMATION_3D_REGISTRY: Record<AnimationId, Animation3DDefinition> = {
  ...UPPER_LOWER_3D_ANIMATIONS,
  ...FLOOR_CORE_3D_ANIMATIONS,
  ...PROPS_3D_ANIMATIONS,
  ...PILATES_MOBILITY_3D_ANIMATIONS,
} as Record<AnimationId, Animation3DDefinition>;

/**
 * Evaluate a single 3D animation frame for normalized cycle time rawT in [0, 1).
 * Shares getSmoothCycle and cue strings with src/engine/animations so 2D & 3D stay in sync.
 */
export function computeAnimation3DFrame(animationId: AnimationId, rawT: number): Animation3DFrame {
  const clampedT = ((rawT % 1) + 1) % 1;
  const def3d = ANIMATION_3D_REGISTRY[animationId] ?? ANIMATION_3D_REGISTRY['overhead-press'];
  const def2d = ANIMATION_REGISTRY[animationId] ?? ANIMATION_REGISTRY['overhead-press'];
  const progress = getSmoothCycle(clampedT);
  const pose = def3d.computePose(progress, clampedT);
  const cueIndex = getCueIndex(clampedT);
  const cue = def2d.cues[cueIndex];

  return { pose, cue, cueIndex, progress };
}

export const ALL_3D_ANIMATION_IDS: readonly AnimationId[] = ANIMATION_IDS;

export function computeMotionGuidePaths3D(animationId: AnimationId, samples = 18): Vec3[][] {
  return buildMotionGuidePaths3D(ANIMATION_3D_REGISTRY, animationId, samples);
}
