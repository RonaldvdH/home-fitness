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

  'reverse-lunge': {
    id: 'reverse-lunge',
    label: 'Dumbbell Reverse Lunge',
    view: 'side',
    cues: ['Step Back & Lower', 'Knee Hover', 'Drive Through Front Heel', 'Stand Tall'],
    computePose(p) {
      const hipX = lerp(160, 152, p);
      const hipY = lerp(158, 194, p);
      const shX = lerp(160, 154, p);
      const shY = lerp(92, 128, p);
      const hdX = lerp(160, 156, p);
      const hdY = lerp(62, 98, p);

      return {
        floorY: 248,
        head: { x: hdX, y: hdY },
        torsoHip: { x: hipX, y: hipY },
        torsoShoulder: { x: shX, y: shY },
        clavicleStart: { x: shX - 4, y: shY },
        clavicleEnd: { x: shX + 4, y: shY },
        legLeft: [
          { x: hipX, y: hipY },
          { x: lerp(154, 134, p), y: lerp(202, 236, p) },
          { x: lerp(148, 98, p), y: 246 },
        ],
        legRight: [
          { x: hipX, y: hipY },
          { x: lerp(172, 194, p), y: lerp(202, 196, p) },
          { x: 192, y: 246 },
        ],
        footLeft: [
          { x: lerp(142, 90, p), y: 246 },
          { x: lerp(154, 106, p), y: 246 },
        ],
        footRight: [
          { x: 190, y: 246 },
          { x: 210, y: 246 },
        ],
        leftArm: null,
        rightArm: {
          shoulder: { x: shX, y: shY + 4 },
          elbow: { x: shX - 2, y: shY + 42 },
          hand: { x: shX - 2, y: shY + 78 },
          dumbbellAngleDeg: 0,
        },
        motionGuidePath: 'M 158 170 L 152 206',
      };
    },
  },

  'glute-bridge': {
    id: 'glute-bridge',
    label: 'Dumbbell Glute Bridge',
    view: 'floor',
    cues: ['Drive Hips Up', 'Squeeze Glutes', 'Lower Slowly', 'Reset on Mat'],
    computePose(p) {
      const hipX = lerp(174, 172, p);
      const hipY = lerp(224, 178, p);
      const kneeX = lerp(212, 218, p);
      const kneeY = lerp(176, 174, p);

      return {
        floorY: 236,
        head: { x: 70, y: 218 },
        torsoHip: { x: hipX, y: hipY },
        torsoShoulder: { x: 100, y: 224 },
        clavicleStart: { x: 100, y: 220 },
        clavicleEnd: { x: 100, y: 228 },
        legLeft: [
          { x: hipX, y: hipY },
          { x: kneeX - 3, y: kneeY },
          { x: 238, y: 234 },
        ],
        legRight: [
          { x: hipX, y: hipY },
          { x: kneeX, y: kneeY },
          { x: 244, y: 234 },
        ],
        footLeft: null,
        footRight: [
          { x: 242, y: 234 },
          { x: 260, y: 234 },
        ],
        leftArm: null,
        rightArm: {
          shoulder: { x: 104, y: 222 },
          elbow: { x: lerp(138, 138, p), y: lerp(226, 204, p) },
          hand: { x: hipX, y: hipY - 10 },
          dumbbellAngleDeg: lerp(0, -18, p),
        },
        motionGuidePath: 'M 174 214 L 172 168',
      };
    },
  },

  crunch: {
    id: 'crunch',
    label: 'Floor Crunches',
    view: 'floor',
    cues: ['Curl Shoulders Up', 'Squeeze Abs', 'Lower Slowly', 'Relax Neck'],
    computePose(p) {
      const shX = lerp(102, 132, p);
      const shY = lerp(222, 178, p);
      const hdX = lerp(74, 118, p);
      const hdY = lerp(216, 152, p);
      const hand = quadBezier({ x: 164, y: 202 }, { x: 182, y: 184 }, { x: 198, y: 168 }, p);

      return {
        floorY: 236,
        head: { x: hdX, y: hdY },
        torsoHip: { x: 180, y: 224 },
        torsoShoulder: { x: shX, y: shY },
        clavicleStart: { x: shX, y: shY - 3 },
        clavicleEnd: { x: shX, y: shY + 4 },
        legLeft: [
          { x: 180, y: 224 },
          { x: 214, y: 176 },
          { x: 240, y: 234 },
        ],
        legRight: [
          { x: 180, y: 224 },
          { x: 218, y: 176 },
          { x: 246, y: 234 },
        ],
        footLeft: null,
        footRight: [
          { x: 244, y: 234 },
          { x: 262, y: 234 },
        ],
        leftArm: null,
        rightArm: {
          shoulder: { x: shX + 4, y: shY + 2 },
          elbow: { x: lerp(134, 166, p), y: lerp(212, 174, p) },
          hand,
          dumbbellAngleDeg: 0,
        },
        motionGuidePath: 'M 164 202 Q 182 184 198 168',
      };
    },
  },

  'leg-raise': {
    id: 'leg-raise',
    label: 'Lying Leg Raises',
    view: 'floor',
    cues: ['Lift Legs Up', 'Core Brace', 'Lower Under Control', 'Hover Above Mat'],
    computePose(p) {
      const hipX = 164;
      const hipY = 224;
      const angle = lerp(-0.06, -Math.PI * 0.48, p);
      const kneeX = hipX + Math.cos(angle) * 44;
      const kneeY = hipY + Math.sin(angle) * 44;
      const ankleX = hipX + Math.cos(angle) * 84;
      const ankleY = hipY + Math.sin(angle) * 84;

      return {
        floorY: 236,
        head: { x: 68, y: 218 },
        torsoHip: { x: hipX, y: hipY },
        torsoShoulder: { x: 96, y: 224 },
        clavicleStart: { x: 96, y: 220 },
        clavicleEnd: { x: 96, y: 228 },
        legLeft: [
          { x: hipX, y: hipY },
          { x: kneeX - 3, y: kneeY },
          { x: ankleX - 3, y: ankleY },
        ],
        legRight: [
          { x: hipX, y: hipY },
          { x: kneeX, y: kneeY },
          { x: ankleX, y: ankleY },
        ],
        footLeft: null,
        footRight: [
          { x: ankleX, y: ankleY },
          {
            x: ankleX + Math.cos(angle - Math.PI / 2) * 14,
            y: ankleY + Math.sin(angle - Math.PI / 2) * 14,
          },
        ],
        leftArm: null,
        rightArm: {
          shoulder: { x: 102, y: 224 },
          elbow: { x: 132, y: 228 },
          hand: { x: 162, y: 228 },
          dumbbellAngleDeg: 0,
        },
        motionGuidePath: 'M 248 219 A 84 84 0 0 0 169 140',
      };
    },
  },

  'russian-twist': {
    id: 'russian-twist',
    label: 'Dumbbell Russian Twists',
    view: 'front',
    cues: ['Rotate Right', 'Oblique Squeeze', 'Rotate Left', 'Oblique Squeeze'],
    computePose(p) {
      const shX = lerp(154, 166, p);
      const hand = quadBezier({ x: 112, y: 196 }, { x: 160, y: 176 }, { x: 208, y: 196 }, p);
      const twistScale = lerp(0.55, 1, 1 - Math.abs(p - 0.5) * 2);

      return {
        floorY: 236,
        head: { x: shX, y: 124 },
        torsoHip: { x: 160, y: 214 },
        torsoShoulder: { x: shX, y: 152 },
        clavicleStart: { x: shX - 18, y: 154 },
        clavicleEnd: { x: shX + 18, y: 154 },
        legLeft: [
          { x: 160, y: 214 },
          { x: 138, y: 186 },
          { x: 132, y: 232 },
        ],
        legRight: [
          { x: 160, y: 214 },
          { x: 182, y: 186 },
          { x: 188, y: 232 },
        ],
        footLeft: [
          { x: 124, y: 232 },
          { x: 136, y: 232 },
        ],
        footRight: [
          { x: 184, y: 232 },
          { x: 196, y: 232 },
        ],
        leftArm: {
          shoulder: { x: shX - 18, y: 154 },
          elbow: { x: lerp(124, 158, p), y: 184 },
          hand,
          dumbbellAngleDeg: 0,
        },
        rightArm: {
          shoulder: { x: shX + 18, y: 154 },
          elbow: { x: lerp(162, 196, p), y: 184 },
          hand,
          dumbbellAngleDeg: lerp(-12, 12, p),
          dumbbellScaleX: twistScale,
        },
        hideLeftDumbbell: true,
        motionGuidePath: 'M 112 196 Q 160 176 208 196',
      };
    },
  },

  'plank-tap': {
    id: 'plank-tap',
    label: 'High Plank Shoulder Taps',
    view: 'floor',
    cues: ['Tap Shoulder', 'Keep Hips Square', 'Plant Hand', 'Brace Core'],
    computePose(p) {
      const hand = quadBezier({ x: 108, y: 234 }, { x: 126, y: 198 }, { x: 112, y: 164 }, p);
      return {
        floorY: 236,
        head: { x: 76, y: 142 },
        torsoHip: { x: 178, y: 192 },
        torsoShoulder: { x: 104, y: 158 },
        clavicleStart: { x: 102, y: 156 },
        clavicleEnd: { x: 108, y: 160 },
        legLeft: [
          { x: 178, y: 192 },
          { x: 212, y: 212 },
          { x: 244, y: 234 },
        ],
        legRight: [
          { x: 178, y: 192 },
          { x: 216, y: 212 },
          { x: 250, y: 234 },
        ],
        footLeft: null,
        footRight: [
          { x: 246, y: 234 },
          { x: 258, y: 234 },
        ],
        leftArm: {
          shoulder: { x: 102, y: 158 },
          elbow: { x: 100, y: 196 },
          hand: { x: 100, y: 234 },
          dumbbellAngleDeg: 0,
        },
        rightArm: {
          shoulder: { x: 108, y: 160 },
          elbow: { x: lerp(108, 128, p), y: lerp(196, 188, p) },
          hand,
          dumbbellAngleDeg: 0,
        },
        motionGuidePath: 'M 108 234 Q 126 198 112 164',
      };
    },
  },

  'band-pull-apart': {
    id: 'band-pull-apart',
    label: 'Resistance Band Pull-Aparts',
    view: 'front',
    cues: ['Pull Band Wide', 'Squeeze Blades', 'Return Slowly', 'Keep Arms Level'],
    computePose(p) {
      const lHandX = lerp(138, 72, p);
      const rHandX = lerp(182, 248, p);
      return {
        ...STANDING_BASE,
        leftArm: {
          shoulder: { x: 140, y: 94 },
          elbow: { x: lerp(132, 104, p), y: 98 },
          hand: { x: lHandX, y: 96 },
          dumbbellAngleDeg: 0,
        },
        rightArm: {
          shoulder: { x: 180, y: 94 },
          elbow: { x: lerp(188, 216, p), y: 98 },
          hand: { x: rHandX, y: 96 },
          dumbbellAngleDeg: 0,
        },
        motionGuidePath: `M ${lHandX.toFixed(1)} 96 L ${rHandX.toFixed(1)} 96`,
      };
    },
  },

  'band-row': {
    id: 'band-row',
    label: 'Banded Bent-Over Rows',
    view: 'side',
    cues: ['Drive Elbows Back', 'Squeeze Lats', 'Control Return', 'Flat Back'],
    computePose(p) {
      const elbow = { x: lerp(186, 134, p), y: lerp(162, 128, p) };
      const hand = { x: lerp(188, 152, p), y: lerp(196, 154, p) };
      return {
        floorY: 248,
        head: { x: 204, y: 92 },
        torsoHip: { x: 132, y: 158 },
        torsoShoulder: { x: 184, y: 118 },
        clavicleStart: { x: 182, y: 118 },
        clavicleEnd: { x: 186, y: 118 },
        legLeft: [
          { x: 132, y: 158 },
          { x: 148, y: 204 },
          { x: 142, y: 246 },
        ],
        legRight: [
          { x: 132, y: 158 },
          { x: 152, y: 204 },
          { x: 146, y: 246 },
        ],
        footLeft: null,
        footRight: [
          { x: 140, y: 246 },
          { x: 162, y: 246 },
        ],
        leftArm: null,
        rightArm: {
          shoulder: { x: 184, y: 118 },
          elbow,
          hand,
          dumbbellAngleDeg: 0,
        },
        motionGuidePath: `M 152 246 L ${hand.x.toFixed(1)} ${hand.y.toFixed(1)}`,
      };
    },
  },

  'band-kickback': {
    id: 'band-kickback',
    label: 'Banded Glute Kickbacks',
    view: 'floor',
    cues: ['Press Heel Back', 'Squeeze Glute', 'Return Controlled', 'Square Hips'],
    computePose(p) {
      const knee = { x: lerp(192, 232, p), y: lerp(232, 184, p) };
      const ankle = { x: lerp(218, 274, p), y: lerp(234, 168, p) };
      return {
        floorY: 236,
        head: { x: 76, y: 150 },
        torsoHip: { x: 186, y: 174 },
        torsoShoulder: { x: 108, y: 168 },
        clavicleStart: { x: 106, y: 166 },
        clavicleEnd: { x: 112, y: 170 },
        legLeft: [
          { x: 186, y: 174 },
          { x: 184, y: 232 },
          { x: 214, y: 234 },
        ],
        legRight: [{ x: 186, y: 174 }, knee, ankle],
        footLeft: null,
        footRight: [ankle, { x: ankle.x + 6, y: ankle.y + 8 }],
        leftArm: {
          shoulder: { x: 106, y: 168 },
          elbow: { x: 104, y: 202 },
          hand: { x: 104, y: 234 },
          dumbbellAngleDeg: 0,
        },
        rightArm: {
          shoulder: { x: 112, y: 170 },
          elbow: { x: 114, y: 202 },
          hand: { x: 114, y: 234 },
          dumbbellAngleDeg: 0,
        },
        motionGuidePath: 'M 218 234 Q 252 204 274 168',
      };
    },
  },

  'wall-sit': {
    id: 'wall-sit',
    label: 'Isometric Wall Sit',
    view: 'side',
    cues: ['Press Back Flat', 'Hold 90° Knees', 'Breathe Steadily', 'Drive Through Heels'],
    computePose(p) {
      // Subtle isometric breathing & postural brace pulse
      const micro = lerp(0, 3, p);
      return {
        floorY: 248,
        head: { x: 104, y: 92 + micro },
        torsoHip: { x: 104, y: 182 + micro },
        torsoShoulder: { x: 104, y: 120 + micro },
        clavicleStart: { x: 102, y: 120 + micro },
        clavicleEnd: { x: 108, y: 120 + micro },
        legLeft: [
          { x: 104, y: 182 + micro },
          { x: 174, y: 182 + micro },
          { x: 174, y: 246 },
        ],
        legRight: [
          { x: 104, y: 182 + micro },
          { x: 178, y: 182 + micro },
          { x: 178, y: 246 },
        ],
        footLeft: null,
        footRight: [
          { x: 174, y: 246 },
          { x: 196, y: 246 },
        ],
        leftArm: null,
        rightArm: {
          shoulder: { x: 108, y: 122 + micro },
          elbow: { x: 142, y: 146 + micro },
          hand: { x: 172, y: 138 + micro },
          dumbbellAngleDeg: 0,
        },
        // Vertical wall line behind the athlete
        motionGuidePath: 'M 88 54 L 88 248',
      };
    },
  },

  'wall-pushup': {
    id: 'wall-pushup',
    label: 'Incline Wall Push-Ups',
    view: 'side',
    cues: ['Lower Toward Wall', 'Brace Core', 'Press Away Smoothly', 'Keep Straight Line'],
    computePose(p) {
      const shX = lerp(164, 198, p);
      const shY = lerp(114, 128, p);
      const hipX = lerp(134, 152, p);
      const hipY = lerp(176, 182, p);
      return {
        floorY: 248,
        head: { x: shX + 16, y: shY - 24 },
        torsoHip: { x: hipX, y: hipY },
        torsoShoulder: { x: shX, y: shY },
        clavicleStart: { x: shX - 2, y: shY },
        clavicleEnd: { x: shX + 2, y: shY },
        legLeft: [
          { x: hipX, y: hipY },
          { x: lerp(114, 124, p), y: 214 },
          { x: 96, y: 246 },
        ],
        legRight: [
          { x: hipX, y: hipY },
          { x: lerp(118, 128, p), y: 214 },
          { x: 100, y: 246 },
        ],
        footLeft: null,
        footRight: [
          { x: 94, y: 246 },
          { x: 112, y: 246 },
        ],
        leftArm: null,
        rightArm: {
          shoulder: { x: shX, y: shY },
          elbow: { x: lerp(196, 182, p), y: lerp(124, 152, p) },
          hand: { x: 232, y: 124 },
          dumbbellAngleDeg: 0,
        },
        // Vertical wall reference line
        motionGuidePath: 'M 236 54 L 236 248',
      };
    },
  },

  'wall-angels': {
    id: 'wall-angels',
    label: 'Wall Angels (Mobility)',
    view: 'front',
    cues: ['Slide Arms Up', 'Keep Wrists Back', 'Glide Down to W', 'Relax Neck'],
    computePose(p) {
      const lElbow = { x: lerp(104, 118, p), y: lerp(116, 78, p) };
      const lHand = { x: lerp(96, 114, p), y: lerp(78, 36, p) };
      const rElbow = { x: lerp(216, 202, p), y: lerp(116, 78, p) };
      const rHand = { x: lerp(224, 206, p), y: lerp(78, 36, p) };
      return {
        ...STANDING_BASE,
        leftArm: {
          shoulder: { x: 140, y: 94 },
          elbow: lElbow,
          hand: lHand,
          dumbbellAngleDeg: 0,
        },
        rightArm: {
          shoulder: { x: 180, y: 94 },
          elbow: rElbow,
          hand: rHand,
          dumbbellAngleDeg: 0,
        },
        motionGuidePath: 'M 96 78 Q 100 54 114 36 M 224 78 Q 220 54 206 36',
      };
    },
  },

  'push-up': {
    id: 'push-up',
    label: 'Classic Floor Push-Ups',
    view: 'floor',
    cues: ['Lower Chest Controlled', 'Pause Above Mat', 'Drive Up Strong', 'Keep Body Rigid'],
    computePose(p) {
      const shY = lerp(164, 208, p);
      const hipY = lerp(194, 218, p);
      return {
        floorY: 236,
        head: { x: 74, y: shY - 14 },
        torsoHip: { x: 182, y: hipY },
        torsoShoulder: { x: 106, y: shY },
        clavicleStart: { x: 104, y: shY },
        clavicleEnd: { x: 110, y: shY + 2 },
        legLeft: [
          { x: 182, y: hipY },
          { x: 214, y: lerp(214, 226, p) },
          { x: 248, y: 234 },
        ],
        legRight: [
          { x: 182, y: hipY },
          { x: 218, y: lerp(214, 226, p) },
          { x: 252, y: 234 },
        ],
        footLeft: null,
        footRight: [
          { x: 248, y: 234 },
          { x: 260, y: 234 },
        ],
        leftArm: {
          shoulder: { x: 104, y: shY },
          elbow: { x: lerp(102, 126, p), y: lerp(198, 210, p) },
          hand: { x: 104, y: 234 },
          dumbbellAngleDeg: 0,
        },
        rightArm: {
          shoulder: { x: 110, y: shY + 2 },
          elbow: { x: lerp(110, 134, p), y: lerp(200, 212, p) },
          hand: { x: 110, y: 234 },
          dumbbellAngleDeg: 0,
        },
        motionGuidePath: 'M 106 164 L 106 208',
      };
    },
  },

  'bird-dog': {
    id: 'bird-dog',
    label: 'Controlled Bird-Dogs',
    view: 'floor',
    cues: ['Reach Opposite Arm & Leg', 'Hold Level Hips', 'Return to Tabletop', 'Brace Core'],
    computePose(p) {
      const rElbow = { x: lerp(114, 78, p), y: lerp(202, 162, p) };
      const rHand = { x: lerp(114, 46, p), y: lerp(234, 158, p) };
      const rKnee = { x: lerp(190, 226, p), y: lerp(232, 174, p) };
      const rAnkle = { x: lerp(218, 272, p), y: lerp(234, 172, p) };
      return {
        floorY: 236,
        head: { x: 82, y: 152 },
        torsoHip: { x: 186, y: 174 },
        torsoShoulder: { x: 112, y: 168 },
        clavicleStart: { x: 110, y: 166 },
        clavicleEnd: { x: 116, y: 170 },
        legLeft: [
          { x: 186, y: 174 },
          { x: 184, y: 232 },
          { x: 212, y: 234 },
        ],
        legRight: [{ x: 186, y: 174 }, rKnee, rAnkle],
        footLeft: null,
        footRight: [rAnkle, { x: rAnkle.x + 6, y: rAnkle.y + 8 }],
        leftArm: {
          shoulder: { x: 110, y: 168 },
          elbow: { x: 108, y: 202 },
          hand: { x: 108, y: 234 },
          dumbbellAngleDeg: 0,
        },
        rightArm: {
          shoulder: { x: 116, y: 170 },
          elbow: rElbow,
          hand: rHand,
          dumbbellAngleDeg: 0,
        },
        motionGuidePath: 'M 114 234 Q 76 196 46 158 M 218 234 Q 248 202 272 172',
      };
    },
  },

  'dead-bug': {
    id: 'dead-bug',
    label: 'Core Dead Bugs',
    view: 'floor',
    cues: [
      'Extend Opposite Arm & Leg',
      'Press Lower Back Flat',
      'Return to Center',
      'Exhale Slowly',
    ],
    computePose(p) {
      const rElbow = { x: lerp(114, 78, p), y: lerp(180, 212, p) };
      const rHand = { x: lerp(114, 48, p), y: lerp(146, 220, p) };
      const rKnee = { x: lerp(192, 224, p), y: lerp(168, 216, p) };
      const rAnkle = { x: lerp(228, 266, p), y: lerp(168, 224, p) };
      return {
        floorY: 236,
        head: { x: 80, y: 214 },
        torsoHip: { x: 184, y: 222 },
        torsoShoulder: { x: 114, y: 220 },
        clavicleStart: { x: 112, y: 218 },
        clavicleEnd: { x: 118, y: 222 },
        legLeft: [
          { x: 184, y: 222 },
          { x: 186, y: 168 },
          { x: 222, y: 168 },
        ],
        legRight: [{ x: 184, y: 222 }, rKnee, rAnkle],
        footLeft: null,
        footRight: [rAnkle, { x: rAnkle.x + 4, y: rAnkle.y - 10 }],
        leftArm: {
          shoulder: { x: 112, y: 218 },
          elbow: { x: 110, y: 182 },
          hand: { x: 110, y: 146 },
          dumbbellAngleDeg: 0,
        },
        rightArm: {
          shoulder: { x: 118, y: 222 },
          elbow: rElbow,
          hand: rHand,
          dumbbellAngleDeg: 0,
        },
        motionGuidePath: 'M 114 146 Q 74 176 48 220 M 228 168 Q 254 192 266 224',
      };
    },
  },

  superman: {
    id: 'superman',
    label: 'Prone Superman Holds',
    view: 'floor',
    cues: ['Lift Chest & Legs', 'Squeeze Glutes & Back', 'Lower Smoothly', 'Keep Neck Neutral'],
    computePose(p) {
      const lift = lerp(0, 26, p);
      return {
        floorY: 236,
        head: { x: 86, y: 218 - lift * 0.9 },
        torsoHip: { x: 180, y: 228 },
        torsoShoulder: { x: 114, y: 224 - lift * 0.7 },
        clavicleStart: { x: 112, y: 224 - lift * 0.7 },
        clavicleEnd: { x: 116, y: 224 - lift * 0.7 },
        legLeft: [
          { x: 180, y: 228 },
          { x: 222, y: 228 - lift * 0.45 },
          { x: 262, y: 230 - lift * 0.95 },
        ],
        legRight: [
          { x: 180, y: 228 },
          { x: 224, y: 228 - lift * 0.45 },
          { x: 266, y: 230 - lift * 0.95 },
        ],
        footLeft: null,
        footRight: [
          { x: 266, y: 230 - lift * 0.95 },
          { x: 276, y: 228 - lift * 0.95 },
        ],
        leftArm: null,
        rightArm: {
          shoulder: { x: 114, y: 224 - lift * 0.7 },
          elbow: { x: 84, y: 224 - lift * 0.9 },
          hand: { x: 52, y: 224 - lift * 1.1 },
          dumbbellAngleDeg: 0,
        },
        motionGuidePath: 'M 52 224 L 52 195 M 266 230 L 266 205',
      };
    },
  },

  'roller-thoracic': {
    id: 'roller-thoracic',
    label: 'Foam Roller Thoracic Extensions',
    view: 'floor',
    cues: ['Open Chest Over Roller', 'Exhale & Relax', 'Curl Gently Up', 'Support Head Lightly'],
    computePose(p) {
      const shY = lerp(196, 212, p);
      const headX = lerp(94, 78, p);
      const headY = lerp(176, 206, p);
      return {
        floorY: 236,
        head: { x: headX, y: headY },
        torsoHip: { x: 182, y: 222 },
        torsoShoulder: { x: 122, y: shY },
        clavicleStart: { x: 120, y: shY },
        clavicleEnd: { x: 124, y: shY },
        legLeft: [
          { x: 182, y: 222 },
          { x: 214, y: 184 },
          { x: 244, y: 234 },
        ],
        legRight: [
          { x: 182, y: 222 },
          { x: 218, y: 184 },
          { x: 248, y: 234 },
        ],
        footLeft: null,
        footRight: [
          { x: 244, y: 234 },
          { x: 262, y: 234 },
        ],
        leftArm: null,
        rightArm: {
          shoulder: { x: 122, y: shY },
          elbow: { x: lerp(110, 96, p), y: lerp(164, 186, p) },
          hand: { x: headX + 4, y: headY - 4 },
          dumbbellAngleDeg: 0,
        },
        // Foam roller cylinder cue under upper back
        motionGuidePath: 'M 122 220 A 14 14 0 1 0 150 220 A 14 14 0 1 0 122 220',
      };
    },
  },

  'roller-quad': {
    id: 'roller-quad',
    label: 'Foam Roller Quad & IT-Band Roll',
    view: 'floor',
    cues: ['Glide Forward Slowly', 'Pause on Tight Spot', 'Roll Back Controlled', 'Brace Core'],
    computePose(p) {
      const shift = lerp(-20, 20, p);
      return {
        floorY: 236,
        head: { x: 74 + shift, y: 188 },
        torsoHip: { x: 172 + shift, y: 204 },
        torsoShoulder: { x: 108 + shift, y: 196 },
        clavicleStart: { x: 106 + shift, y: 196 },
        clavicleEnd: { x: 110 + shift, y: 196 },
        legLeft: [
          { x: 172 + shift, y: 204 },
          { x: 214 + shift, y: 212 },
          { x: 254 + shift, y: 216 },
        ],
        legRight: [
          { x: 172 + shift, y: 204 },
          { x: 216 + shift, y: 212 },
          { x: 256 + shift, y: 216 },
        ],
        footLeft: null,
        footRight: [
          { x: 256 + shift, y: 216 },
          { x: 264 + shift, y: 224 },
        ],
        leftArm: null,
        rightArm: {
          shoulder: { x: 108 + shift, y: 196 },
          elbow: { x: 104 + shift, y: 232 },
          hand: { x: 78 + shift, y: 234 },
          dumbbellAngleDeg: 0,
        },
        // Stationary foam roller under thighs + glide arrow
        motionGuidePath:
          'M 186 222 A 13 13 0 1 0 212 222 A 13 13 0 1 0 186 222 M 176 244 L 222 244',
      };
    },
  },

  'roller-glute': {
    id: 'roller-glute',
    label: 'Foam Roller Glute Release',
    view: 'floor',
    cues: ['Roll Over Glute', 'Breathe Into Tension', 'Glide Back Gently', 'Keep Chest Tall'],
    computePose(p) {
      const shift = lerp(-16, 16, p);
      return {
        floorY: 236,
        head: { x: 120 + shift, y: 126 },
        torsoHip: { x: 162 + shift, y: 206 },
        torsoShoulder: { x: 132 + shift, y: 152 },
        clavicleStart: { x: 130 + shift, y: 152 },
        clavicleEnd: { x: 134 + shift, y: 152 },
        legLeft: [
          { x: 162 + shift, y: 206 },
          { x: 206 + shift, y: 184 },
          { x: 226 + shift, y: 234 },
        ],
        legRight: [
          { x: 162 + shift, y: 206 },
          { x: 196 + shift, y: 182 },
          { x: 212 + shift, y: 194 },
        ],
        footLeft: null,
        footRight: [
          { x: 226 + shift, y: 234 },
          { x: 244 + shift, y: 234 },
        ],
        leftArm: null,
        rightArm: {
          shoulder: { x: 132 + shift, y: 152 },
          elbow: { x: 112 + shift, y: 194 },
          hand: { x: 100 + shift, y: 234 },
          dumbbellAngleDeg: 0,
        },
        // Foam roller under glutes
        motionGuidePath:
          'M 148 222 A 13 13 0 1 0 174 222 A 13 13 0 1 0 148 222 M 138 244 L 184 244',
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
