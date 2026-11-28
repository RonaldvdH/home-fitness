/**
 * 3D motion-guide trajectory sampler for concentric movement paths.
 */

import type { AnimationId } from '../../domain/schema';
import { add3, dist3, scale3 } from './ik';
import type { Animation3DDefinition, RigPose3D, Vec3 } from './types';

export type MotionGuideJoint =
  | 'leftHand'
  | 'rightHand'
  | 'midHand'
  | 'leftAnkle'
  | 'rightAnkle'
  | 'pelvis'
  | 'chest'
  | 'head';

const MOTION_GUIDE_JOINTS: Record<AnimationId, readonly MotionGuideJoint[]> = {
  'overhead-press': ['leftHand', 'rightHand'],
  'bent-row': ['leftHand', 'rightHand'],
  'bicep-curl': ['leftHand', 'rightHand'],
  'lateral-raise': ['leftHand', 'rightHand'],
  'front-raise': ['leftHand', 'rightHand'],
  'tricep-extension': ['midHand'],
  squat: ['pelvis'],
  rdl: ['leftHand', 'rightHand'],
  'reverse-lunge': ['pelvis', 'leftAnkle'],
  'floor-press': ['leftHand', 'rightHand'],
  'glute-bridge': ['pelvis'],
  crunch: ['chest'],
  'leg-raise': ['leftAnkle', 'rightAnkle'],
  'russian-twist': ['midHand'],
  'dead-bug': ['rightHand', 'leftAnkle'],
  'plank-tap': ['rightHand'],
  'push-up': ['chest'],
  'bird-dog': ['rightHand', 'leftAnkle'],
  superman: ['rightHand', 'rightAnkle'],
  'band-pull-apart': ['leftHand', 'rightHand'],
  'band-row': ['leftHand', 'rightHand'],
  'band-bicep-curl': ['leftHand', 'rightHand'],
  'band-kickback': ['rightAnkle'],
  'wall-sit': [],
  'wall-pushup': ['chest'],
  'wall-angels': ['leftHand', 'rightHand'],
  'roller-thoracic': ['head'],
  'roller-quad': ['pelvis'],
  'roller-glute': ['pelvis'],
};

function readMotionGuidePoint(pose: RigPose3D, joint: MotionGuideJoint): Vec3 {
  switch (joint) {
    case 'leftHand':
      return pose.leftArm.hand;
    case 'rightHand':
      return pose.rightArm.hand;
    case 'midHand':
      return scale3(add3(pose.leftArm.hand, pose.rightArm.hand), 0.5);
    case 'leftAnkle':
      return pose.leftLeg.ankle;
    case 'rightAnkle':
      return pose.rightLeg.ankle;
    case 'pelvis':
      return pose.pelvis;
    case 'chest':
      return pose.chest;
    case 'head':
      return pose.head;
  }
}

/**
 * Sample clean 3D motion-guide polylines for the primary moving joint(s) of an exercise
 * across its concentric lift phase (progress from 0 -> 1). Isometric holds return [].
 */
export function buildMotionGuidePaths3D(
  registry: Record<AnimationId, Animation3DDefinition>,
  animationId: AnimationId,
  samples = 18,
): Vec3[][] {
  const def = registry[animationId] ?? registry['overhead-press'];
  const joints = MOTION_GUIDE_JOINTS[animationId] ?? [];
  if (joints.length === 0 || samples < 2) return [];

  const paths: Vec3[][] = joints.map(() => []);
  for (let i = 0; i < samples; i += 1) {
    const progress = i / (samples - 1);
    const pose = def.computePose(progress, progress * 0.5);
    for (let j = 0; j < joints.length; j += 1) {
      paths[j]!.push(readMotionGuidePoint(pose, joints[j]!));
    }
  }

  return paths.filter((pts) => {
    let totalLen = 0;
    for (let i = 1; i < pts.length; i += 1) {
      totalLen += dist3(pts[i - 1]!, pts[i]!);
    }
    return totalLen >= 0.05;
  });
}
