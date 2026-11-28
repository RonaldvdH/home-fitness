/**
 * 2D SVG pose definitions for core/abs and elastic resistance band exercises.
 */

import type { AnimationId } from '../../domain/schema';
import { lerp, quadBezier, STANDING_BASE, type AnimationDefinition } from './math';

export const CORE_BAND_ANIMATIONS: Partial<Record<AnimationId, AnimationDefinition>> = {
  'glute-bridge': {
    id: 'glute-bridge',
    label: 'Dumbbell Glute Bridge',
    view: 'floor',
    cues: ['Drive Hips Up', 'Squeeze Glutes', 'Lower Slowly', 'Reset on Mat'],
    computePose(p) {
      const hipX = lerp(174, 172, p);
      const hipY = lerp(227, 180, p);
      const kneeX = lerp(212, 218, p);
      const kneeY = lerp(178, 174, p);

      return {
        floorY: 236,
        head: { x: 70, y: 218 },
        torsoHip: { x: hipX, y: hipY },
        torsoShoulder: { x: 100, y: 227 },
        clavicleStart: { x: 100, y: 223 },
        clavicleEnd: { x: 100, y: 231 },
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
          shoulder: { x: 104, y: 225 },
          elbow: { x: lerp(138, 138, p), y: lerp(229, 206, p) },
          hand: { x: hipX, y: hipY - 10 },
          dumbbellAngleDeg: lerp(0, -18, p),
        },
        motionGuidePath: 'M 174 217 L 172 170',
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
      const shY = lerp(226, 180, p);
      const hdX = lerp(74, 118, p);
      const hdY = lerp(218, 154, p);
      const hand = quadBezier({ x: 164, y: 205 }, { x: 182, y: 186 }, { x: 198, y: 170 }, p);

      return {
        floorY: 236,
        head: { x: hdX, y: hdY },
        torsoHip: { x: 180, y: 227 },
        torsoShoulder: { x: shX, y: shY },
        clavicleStart: { x: shX, y: shY - 3 },
        clavicleEnd: { x: shX, y: shY + 4 },
        legLeft: [
          { x: 180, y: 227 },
          { x: 214, y: 178 },
          { x: 240, y: 234 },
        ],
        legRight: [
          { x: 180, y: 227 },
          { x: 218, y: 178 },
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
          elbow: { x: lerp(134, 166, p), y: lerp(215, 176, p) },
          hand,
          dumbbellAngleDeg: 0,
        },
        motionGuidePath: 'M 164 205 Q 182 186 198 170',
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
      const hipY = 227;
      const angle = lerp(-0.06, -Math.PI * 0.48, p);
      const kneeX = hipX + Math.cos(angle) * 44;
      const kneeY = hipY + Math.sin(angle) * 44;
      const ankleX = hipX + Math.cos(angle) * 84;
      const ankleY = hipY + Math.sin(angle) * 84;

      return {
        floorY: 236,
        head: { x: 68, y: 218 },
        torsoHip: { x: hipX, y: hipY },
        torsoShoulder: { x: 96, y: 227 },
        clavicleStart: { x: 96, y: 223 },
        clavicleEnd: { x: 96, y: 231 },
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
          shoulder: { x: 102, y: 227 },
          elbow: { x: 132, y: 231 },
          hand: { x: 162, y: 231 },
          dumbbellAngleDeg: 0,
        },
        motionGuidePath: 'M 248 222 A 84 84 0 0 0 169 143',
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
      const hand = quadBezier({ x: 112, y: 208 }, { x: 160, y: 188 }, { x: 208, y: 208 }, p);
      const twistScale = lerp(0.55, 1, 1 - Math.abs(p - 0.5) * 2);

      return {
        floorY: 236,
        head: { x: shX, y: 137 },
        torsoHip: { x: 160, y: 227 },
        torsoShoulder: { x: shX, y: 165 },
        clavicleStart: { x: shX - 18, y: 167 },
        clavicleEnd: { x: shX + 18, y: 167 },
        legLeft: [
          { x: 160, y: 227 },
          { x: 138, y: 196 },
          { x: 132, y: 234 },
        ],
        legRight: [
          { x: 160, y: 227 },
          { x: 182, y: 196 },
          { x: 188, y: 234 },
        ],
        footLeft: [
          { x: 124, y: 234 },
          { x: 136, y: 234 },
        ],
        footRight: [
          { x: 184, y: 234 },
          { x: 196, y: 234 },
        ],
        leftArm: {
          shoulder: { x: shX - 18, y: 167 },
          elbow: { x: lerp(124, 158, p), y: 196 },
          hand,
          dumbbellAngleDeg: 0,
        },
        rightArm: {
          shoulder: { x: shX + 18, y: 167 },
          elbow: { x: lerp(162, 196, p), y: 196 },
          hand,
          dumbbellAngleDeg: lerp(-12, 12, p),
          dumbbellScaleX: twistScale,
        },
        hideLeftDumbbell: true,
        motionGuidePath: 'M 112 208 Q 160 188 208 208',
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

  'band-bicep-curl': {
    id: 'band-bicep-curl',
    label: 'Banded Bicep Curls',
    view: 'front',
    cues: ['Curl Against Band', 'Squeeze Biceps', '2s Slow Lower', 'Keep Tension'],
    computePose(p) {
      const leftElbow = { x: 134, y: 128 };
      const rightElbow = { x: 186, y: 128 };
      const leftHand = { x: lerp(130, 134, p), y: lerp(164, 96, p) };
      const rightHand = { x: lerp(190, 186, p), y: lerp(164, 96, p) };
      return {
        ...STANDING_BASE,
        leftArm: {
          shoulder: { x: 140, y: 94 },
          elbow: leftElbow,
          hand: leftHand,
          dumbbellAngleDeg: 0,
        },
        rightArm: {
          shoulder: { x: 180, y: 94 },
          elbow: rightElbow,
          hand: rightHand,
          dumbbellAngleDeg: 0,
        },
        motionGuidePath: `M 136 246 L ${leftHand.x.toFixed(1)} ${leftHand.y.toFixed(1)} M 184 246 L ${rightHand.x.toFixed(1)} ${rightHand.y.toFixed(1)} M 136 246 L 184 246`,
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
};
