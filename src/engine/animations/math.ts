/**
 * Pure 2D animation types, easing math, and shared standing base geometry.
 * Zero DOM or Preact dependencies.
 */

import type { AnimationId } from '../../domain/schema';

export interface Point2D {
  x: number;
  y: number;
}

export interface ArmPose {
  shoulder: Point2D;
  elbow: Point2D;
  hand: Point2D;
  dumbbellAngleDeg: number;
  /** Optional horizontal foreshortening (0.25..1) to depict wrist supination/pronation. */
  dumbbellScaleX?: number;
}

export interface AthletePose {
  floorY: number;
  head: Point2D;
  torsoHip: Point2D;
  torsoShoulder: Point2D;
  clavicleStart: Point2D;
  clavicleEnd: Point2D;
  legLeft: [Point2D, Point2D, Point2D];
  legRight: [Point2D, Point2D, Point2D];
  footLeft: [Point2D, Point2D] | null;
  footRight: [Point2D, Point2D];
  leftArm: ArmPose | null;
  rightArm: ArmPose;
  /** Hide the left dumbbell when both hands grip a single shared weight (e.g., Russian twists). */
  hideLeftDumbbell?: boolean;
  motionGuidePath: string;
}

export interface AnimationDefinition {
  id: AnimationId;
  label: string;
  view: 'front' | 'side' | 'floor';
  cues: readonly [lift: string, peak: string, lower: string, reset: string];
  computePose: (progress: number) => AthletePose;
}

/**
 * Linear interpolation between a and b.
 */
export function lerp(a: number, b: number, p: number): number {
  return a + (b - a) * p;
}

/**
 * Smooth Hermite interpolation clamped to [0, 1] over [edge0, edge1].
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Evaluate a 2D quadratic Bezier curve matching SVG `M p0 Q ctrl p1`.
 */
export function quadBezier(p0: Point2D, ctrl: Point2D, p1: Point2D, t: number): Point2D {
  const inv = 1 - t;
  return {
    x: inv * inv * p0.x + 2 * inv * t * ctrl.x + t * t * p1.x,
    y: inv * inv * p0.y + 2 * inv * t * ctrl.y + t * t * p1.y,
  };
}

/**
 * Smooth cubic ease-in-out wave [0 -> 1 -> 0] with brief peak and bottom pauses.
 * @param t Normalized cycle time in [0, 1)
 */
export function getSmoothCycle(t: number): number {
  const clamped = ((t % 1) + 1) % 1;
  if (clamped < 0.45) {
    const u = clamped / 0.45;
    return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  }
  if (clamped < 0.55) {
    return 1;
  }
  if (clamped < 0.95) {
    const u = (clamped - 0.55) / 0.4;
    const ease = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    return 1 - ease;
  }
  return 0;
}

export const STANDING_BASE = {
  floorY: 248,
  head: { x: 160, y: 62 },
  torsoHip: { x: 160, y: 158 },
  torsoShoulder: { x: 160, y: 92 },
  clavicleStart: { x: 140, y: 94 },
  clavicleEnd: { x: 180, y: 94 },
  legLeft: [
    { x: 160, y: 158 },
    { x: 144, y: 202 },
    { x: 138, y: 246 },
  ] as [Point2D, Point2D, Point2D],
  legRight: [
    { x: 160, y: 158 },
    { x: 176, y: 202 },
    { x: 182, y: 246 },
  ] as [Point2D, Point2D, Point2D],
  footLeft: [
    { x: 128, y: 246 },
    { x: 142, y: 246 },
  ] as [Point2D, Point2D],
  footRight: [
    { x: 178, y: 246 },
    { x: 192, y: 246 },
  ] as [Point2D, Point2D],
};

export const DEFAULT_CUES = [
  'Lift / Drive',
  'Peak Squeeze',
  'Controlled Lower',
  'Reset Position',
] as const;

export function getCueIndex(t: number): 0 | 1 | 2 | 3 {
  const clamped = ((t % 1) + 1) % 1;
  if (clamped < 0.45) return 0;
  if (clamped < 0.55) return 1;
  if (clamped < 0.95) return 2;
  return 3;
}
