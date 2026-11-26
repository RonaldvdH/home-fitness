/**
 * Pure 60 FPS kinematics pose registry and easing math.
 * Zero DOM dependencies so all poses and cues can be unit-tested directly.
 */

import { ANIMATION_IDS, type AnimationId } from '../domain/schema';

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

const STANDING_BASE = {
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

const DEFAULT_CUES = [
  'Lift / Drive',
  'Peak Squeeze',
  'Controlled Lower',
  'Reset Position',
] as const;

export const ANIMATION_REGISTRY: Record<AnimationId, AnimationDefinition> = {
  'overhead-press': {
    id: 'overhead-press',
    label: 'Standing Overhead Press',
    view: 'front',
    cues: ['Press Overhead', 'Lockout Hold', 'Controlled Lower', 'Rack Reset'],
    computePose(p) {
      return {
        ...STANDING_BASE,
        leftArm: {
          shoulder: { x: 140, y: 94 },
          elbow: { x: lerp(116, 134, p), y: lerp(116, 60, p) },
          hand: { x: lerp(114, 138, p), y: lerp(82, 24, p) },
          dumbbellAngleDeg: lerp(-6, 0, p),
        },
        rightArm: {
          shoulder: { x: 180, y: 94 },
          elbow: { x: lerp(204, 186, p), y: lerp(116, 60, p) },
          hand: { x: lerp(206, 182, p), y: lerp(82, 24, p) },
          dumbbellAngleDeg: lerp(6, 0, p),
        },
        motionGuidePath: 'M 114 82 Q 124 52 138 24 M 206 82 Q 196 52 182 24',
      };
    },
  },

  'bent-row': {
    id: 'bent-row',
    label: 'Bent-Over Dumbbell Row',
    view: 'side',
    cues: ['Pull Elbows Back', 'Squeeze Lats', 'Controlled Lower', 'Full Hang'],
    computePose(p) {
      return {
        floorY: 248,
        head: { x: 218, y: 85 },
        torsoHip: { x: 130, y: 152 },
        torsoShoulder: { x: 194, y: 102 },
        clavicleStart: { x: 190, y: 100 },
        clavicleEnd: { x: 198, y: 106 },
        legLeft: [
          { x: 130, y: 152 },
          { x: 142, y: 198 },
          { x: 134, y: 246 },
        ],
        legRight: [
          { x: 130, y: 152 },
          { x: 146, y: 198 },
          { x: 138, y: 246 },
        ],
        footLeft: null,
        footRight: [
          { x: 136, y: 246 },
          { x: 158, y: 246 },
        ],
        leftArm: null,
        rightArm: {
          shoulder: { x: 192, y: 106 },
          elbow: { x: lerp(192, 154, p), y: lerp(144, 108, p) },
          hand: { x: lerp(192, 166, p), y: lerp(182, 142, p) },
          dumbbellAngleDeg: lerp(0, -18, p),
        },
        motionGuidePath: 'M 192 182 Q 176 162 166 142',
      };
    },
  },

  'floor-press': {
    id: 'floor-press',
    label: 'Floor Chest Press',
    view: 'floor',
    cues: ['Press Up', 'Lockout Hold', 'Lower to Floor', 'Floor Contact Pause'],
    computePose(p) {
      return {
        floorY: 236,
        head: { x: 70, y: 216 },
        torsoHip: { x: 176, y: 224 },
        torsoShoulder: { x: 96, y: 224 },
        clavicleStart: { x: 108, y: 218 },
        clavicleEnd: { x: 108, y: 228 },
        legLeft: [
          { x: 176, y: 224 },
          { x: 212, y: 174 },
          { x: 240, y: 234 },
        ],
        legRight: [
          { x: 176, y: 224 },
          { x: 216, y: 174 },
          { x: 246, y: 234 },
        ],
        footLeft: null,
        footRight: [
          { x: 244, y: 234 },
          { x: 262, y: 234 },
        ],
        leftArm: null,
        rightArm: {
          shoulder: { x: 108, y: 218 },
          elbow: { x: lerp(86, 108, p), y: lerp(228, 180, p) },
          hand: { x: lerp(90, 108, p), y: lerp(184, 142, p) },
          dumbbellAngleDeg: 0,
        },
        motionGuidePath: 'M 90 184 Q 100 162 108 142',
      };
    },
  },

  'bicep-curl': {
    id: 'bicep-curl',
    label: 'Standing Bicep Curl',
    view: 'front',
    cues: ['Curl & Rotate', 'Palms-Up Squeeze', 'Lower & Reset Grip', 'Neutral Hang'],
    computePose(p) {
      // Hand follows the exact quadratic Bezier curve shown by motionGuidePath.
      const leftHand = quadBezier({ x: 128, y: 174 }, { x: 118, y: 134 }, { x: 126, y: 94 }, p);
      const rightHand = quadBezier({ x: 192, y: 174 }, { x: 202, y: 134 }, { x: 194, y: 94 }, p);

      // Start neutral (dumbbells end-on beside thighs) and supinate halfway through the lift.
      const supination = smoothstep(0.25, 0.8, p);
      const dumbbellScaleX = lerp(0.28, 1, supination);

      return {
        ...STANDING_BASE,
        leftArm: {
          shoulder: { x: 140, y: 94 },
          elbow: { x: lerp(134, 133, p), y: lerp(134, 132, p) },
          hand: leftHand,
          dumbbellAngleDeg: lerp(6, -10, supination),
          dumbbellScaleX,
        },
        rightArm: {
          shoulder: { x: 180, y: 94 },
          elbow: { x: lerp(186, 187, p), y: lerp(134, 132, p) },
          hand: rightHand,
          dumbbellAngleDeg: lerp(-6, 10, supination),
          dumbbellScaleX,
        },
        motionGuidePath: 'M 128 174 Q 118 134 126 94 M 192 174 Q 202 134 194 94',
      };
    },
  },

  'lateral-raise': {
    id: 'lateral-raise',
    label: 'Lateral Raises',
    view: 'front',
    cues: DEFAULT_CUES,
    computePose(p) {
      const angleL = lerp(Math.PI * 0.56, Math.PI * 1.02, p);
      const angleR = lerp(Math.PI * 0.44, -Math.PI * 0.02, p);

      return {
        ...STANDING_BASE,
        leftArm: {
          shoulder: { x: 140, y: 94 },
          elbow: { x: 140 + Math.cos(angleL) * 38, y: 94 + Math.sin(angleL) * 38 },
          hand: { x: 140 + Math.cos(angleL - 0.08) * 74, y: 94 + Math.sin(angleL - 0.08) * 74 },
          dumbbellAngleDeg: lerp(80, 0, p),
        },
        rightArm: {
          shoulder: { x: 180, y: 94 },
          elbow: { x: 180 + Math.cos(angleR) * 38, y: 94 + Math.sin(angleR) * 38 },
          hand: { x: 180 + Math.cos(angleR + 0.08) * 74, y: 94 + Math.sin(angleR + 0.08) * 74 },
          dumbbellAngleDeg: lerp(-80, 0, p),
        },
        motionGuidePath: 'M 132 168 A 74 74 0 0 1 66 95 M 188 168 A 74 74 0 0 0 254 95',
      };
    },
  },

  'front-raise': {
    id: 'front-raise',
    label: 'Alternating Front Raises',
    view: 'side',
    cues: DEFAULT_CUES,
    computePose(p) {
      const angle = lerp(Math.PI * 0.48, 0, p);
      return {
        floorY: 248,
        head: { x: 160, y: 62 },
        torsoHip: { x: 160, y: 158 },
        torsoShoulder: { x: 160, y: 92 },
        clavicleStart: { x: 156, y: 94 },
        clavicleEnd: { x: 164, y: 94 },
        legLeft: [
          { x: 160, y: 158 },
          { x: 156, y: 202 },
          { x: 154, y: 246 },
        ],
        legRight: [
          { x: 160, y: 158 },
          { x: 162, y: 202 },
          { x: 160, y: 246 },
        ],
        footLeft: null,
        footRight: [
          { x: 158, y: 246 },
          { x: 178, y: 246 },
        ],
        leftArm: null,
        rightArm: {
          shoulder: { x: 160, y: 96 },
          elbow: { x: 160 + Math.cos(angle) * 38, y: 96 + Math.sin(angle) * 38 },
          hand: { x: 160 + Math.cos(angle - 0.06) * 74, y: 96 + Math.sin(angle - 0.06) * 74 },
          dumbbellAngleDeg: lerp(90, 0, p),
        },
        motionGuidePath: 'M 169 169 A 74 74 0 0 0 234 92',
      };
    },
  },

  'tricep-extension': {
    id: 'tricep-extension',
    label: 'Overhead Tricep Extension',
    view: 'front',
    cues: ['Extend Overhead', 'Peak Squeeze', 'Controlled Lower', 'Stretch Bottom'],
    computePose(p) {
      return {
        ...STANDING_BASE,
        head: { x: 160, y: 64 },
        torsoShoulder: { x: 160, y: 94 },
        clavicleStart: { x: 142, y: 96 },
        clavicleEnd: { x: 178, y: 96 },
        leftArm: {
          shoulder: { x: 142, y: 96 },
          elbow: { x: 144, y: 52 },
          hand: { x: lerp(150, 148, p), y: lerp(82, 22, p) },
          dumbbellAngleDeg: 0,
        },
        rightArm: {
          shoulder: { x: 178, y: 96 },
          elbow: { x: 176, y: 52 },
          hand: { x: lerp(170, 172, p), y: lerp(82, 22, p) },
          dumbbellAngleDeg: 0,
        },
        motionGuidePath: 'M 148 82 L 148 22 M 172 82 L 172 22',
      };
    },
  },

  squat: {
    id: 'squat',
    label: 'Dumbbell Squat',
    view: 'front',
    cues: ['Lower Hips', 'Bottom Hold', 'Drive Up', 'Tall Stand'],
    computePose(p) {
      const hipY = lerp(158, 198, p);
      const shoulderY = lerp(92, 134, p);
      const headY = lerp(62, 104, p);
      const kneeOut = lerp(16, 30, p);
      const kneeY = lerp(202, 204, p);

      return {
        floorY: 248,
        head: { x: 160, y: headY },
        torsoHip: { x: 160, y: hipY },
        torsoShoulder: { x: 160, y: shoulderY },
        clavicleStart: { x: 140, y: shoulderY + 2 },
        clavicleEnd: { x: 180, y: shoulderY + 2 },
        legLeft: [
          { x: 160, y: hipY },
          { x: 160 - kneeOut, y: kneeY },
          { x: 138, y: 246 },
        ],
        legRight: [
          { x: 160, y: hipY },
          { x: 160 + kneeOut, y: kneeY },
          { x: 182, y: 246 },
        ],
        footLeft: [
          { x: 128, y: 246 },
          { x: 142, y: 246 },
        ],
        footRight: [
          { x: 178, y: 246 },
          { x: 192, y: 246 },
        ],
        leftArm: {
          shoulder: { x: 140, y: shoulderY + 2 },
          elbow: { x: 132, y: shoulderY + 38 },
          hand: { x: 130, y: shoulderY + 72 },
          dumbbellAngleDeg: 0,
        },
        rightArm: {
          shoulder: { x: 180, y: shoulderY + 2 },
          elbow: { x: 188, y: shoulderY + 38 },
          hand: { x: 190, y: shoulderY + 72 },
          dumbbellAngleDeg: 0,
        },
        motionGuidePath: 'M 130 164 L 130 206 M 190 164 L 190 206',
      };
    },
  },

  rdl: {
    id: 'rdl',
    label: 'Romanian Deadlift (Hip Hinge)',
    view: 'side',
    cues: ['Hinge Hips Back', 'Hamstring Stretch', 'Drive Hips Forward', 'Tall Stand'],
    computePose(p) {
      const hipX = lerp(160, 132, p);
      const hipY = lerp(158, 154, p);
      const shX = lerp(160, 198, p);
      const shY = lerp(92, 118, p);
      const hdX = lerp(160, 224, p);
      const hdY = lerp(62, 108, p);

      return {
        floorY: 248,
        head: { x: hdX, y: hdY },
        torsoHip: { x: hipX, y: hipY },
        torsoShoulder: { x: shX, y: shY },
        clavicleStart: { x: shX - 4, y: shY },
        clavicleEnd: { x: shX + 4, y: shY + 2 },
        legLeft: [
          { x: hipX, y: hipY },
          { x: 154, y: 202 },
          { x: 150, y: 246 },
        ],
        legRight: [
          { x: hipX, y: hipY },
          { x: 158, y: 202 },
          { x: 154, y: 246 },
        ],
        footLeft: null,
        footRight: [
          { x: 152, y: 246 },
          { x: 174, y: 246 },
        ],
        leftArm: null,
        rightArm: {
          shoulder: { x: shX, y: shY + 4 },
          elbow: { x: shX - 2, y: shY + 42 },
          hand: { x: shX - 2, y: shY + 80 },
          dumbbellAngleDeg: 0,
        },
        motionGuidePath: 'M 158 172 Q 180 186 196 198',
      };
    },
  },
};

export const ANIMATION_OPTIONS: readonly { value: AnimationId; label: string }[] =
  ANIMATION_IDS.map((id) => ({
    value: id,
    label: ANIMATION_REGISTRY[id].label,
  }));

export function getAnimationDefinition(type: AnimationId): AnimationDefinition {
  return ANIMATION_REGISTRY[type] ?? ANIMATION_REGISTRY['overhead-press'];
}

export function getCueText(t: number, type: AnimationId): string {
  const clamped = ((t % 1) + 1) % 1;
  const def = getAnimationDefinition(type);
  if (clamped < 0.45) return def.cues[0];
  if (clamped < 0.55) return def.cues[1];
  if (clamped < 0.95) return def.cues[2];
  return def.cues[3];
}

export function computeAnimationFrame(
  type: AnimationId,
  rawT: number,
): { pose: AthletePose; cue: string; progress: number } {
  const def = getAnimationDefinition(type);
  const progress = getSmoothCycle(rawT);
  return {
    pose: def.computePose(progress),
    cue: getCueText(rawT, type),
    progress,
  };
}
