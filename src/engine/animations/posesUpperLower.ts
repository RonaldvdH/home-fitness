/**
 * 2D SVG pose definitions for standing upper-body and lower-body exercises.
 */

import type { AnimationId } from '../../domain/schema';
import {
  DEFAULT_CUES,
  lerp,
  quadBezier,
  smoothstep,
  STANDING_BASE,
  type AnimationDefinition,
} from './math';

export const UPPER_LOWER_ANIMATIONS: Partial<Record<AnimationId, AnimationDefinition>> = {
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
        head: { x: 70, y: 218 },
        torsoHip: { x: 176, y: 227 },
        torsoShoulder: { x: 96, y: 227 },
        clavicleStart: { x: 108, y: 221 },
        clavicleEnd: { x: 108, y: 231 },
        legLeft: [
          { x: 176, y: 227 },
          { x: 212, y: 177 },
          { x: 240, y: 234 },
        ],
        legRight: [
          { x: 176, y: 227 },
          { x: 216, y: 177 },
          { x: 246, y: 234 },
        ],
        footLeft: null,
        footRight: [
          { x: 244, y: 234 },
          { x: 262, y: 234 },
        ],
        leftArm: null,
        rightArm: {
          shoulder: { x: 108, y: 221 },
          elbow: { x: lerp(86, 108, p), y: lerp(231, 183, p) },
          hand: { x: lerp(90, 108, p), y: lerp(187, 145, p) },
          dumbbellAngleDeg: 0,
        },
        motionGuidePath: 'M 90 187 Q 100 165 108 145',
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
};
