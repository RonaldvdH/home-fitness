/**
 * Public 2D SVG animation registry and frame evaluator.
 * Pure TypeScript module with zero DOM or Preact dependencies.
 */

import { ANIMATION_IDS, type AnimationId } from '../../domain/schema';
import { getCueIndex, getSmoothCycle, type AnimationDefinition, type AthletePose } from './math';
import { CORE_BAND_ANIMATIONS } from './posesCoreBands';
import { PILATES_MOBILITY_ANIMATIONS } from './posesPilatesMobility';
import { UPPER_LOWER_ANIMATIONS } from './posesUpperLower';
import { WALL_FLOOR_ROLLER_ANIMATIONS } from './posesWallFloorRoller';

export {
  getCueIndex,
  getSmoothCycle,
  lerp,
  quadBezier,
  smoothstep,
  type AnimationDefinition,
  type ArmPose,
  type AthletePose,
  type Point2D,
} from './math';

export const ANIMATION_REGISTRY: Record<AnimationId, AnimationDefinition> = {
  ...UPPER_LOWER_ANIMATIONS,
  ...CORE_BAND_ANIMATIONS,
  ...WALL_FLOOR_ROLLER_ANIMATIONS,
  ...PILATES_MOBILITY_ANIMATIONS,
} as Record<AnimationId, AnimationDefinition>;

export const ANIMATION_OPTIONS: readonly { value: AnimationId; label: string }[] =
  ANIMATION_IDS.map((id) => ({
    value: id,
    label: ANIMATION_REGISTRY[id].label,
  }));

export function getAnimationDefinition(type: AnimationId): AnimationDefinition {
  return ANIMATION_REGISTRY[type] ?? ANIMATION_REGISTRY['overhead-press'];
}

export function getBreathCues(type: AnimationId): readonly [string, string, string, string] | null {
  return getAnimationDefinition(type).breathCues ?? null;
}

export function getCueText(t: number, type: AnimationId): string {
  const def = getAnimationDefinition(type);
  return def.cues[getCueIndex(t)];
}

export function computeAnimationFrame(
  type: AnimationId,
  rawT: number,
): { pose: AthletePose; cue: string; cueIndex: 0 | 1 | 2 | 3; progress: number } {
  const def = getAnimationDefinition(type);
  const progress = getSmoothCycle(rawT);
  const cueIndex = getCueIndex(rawT);
  return {
    pose: def.computePose(progress),
    cue: def.cues[cueIndex],
    cueIndex,
    progress,
  };
}
