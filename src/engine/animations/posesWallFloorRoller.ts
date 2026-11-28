/**
 * 2D SVG pose definitions for wall, bodyweight floor, and foam-roller exercises.
 */

import type { AnimationId } from '../../domain/schema';
import { lerp, STANDING_BASE, type AnimationDefinition } from './math';

export const WALL_FLOOR_ROLLER_ANIMATIONS: Partial<Record<AnimationId, AnimationDefinition>> = {
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
      const rElbow = { x: lerp(114, 78, p), y: lerp(186, 218, p) };
      const rHand = { x: lerp(114, 48, p), y: lerp(152, 226, p) };
      const rKnee = { x: lerp(192, 224, p), y: lerp(172, 220, p) };
      const rAnkle = { x: lerp(228, 266, p), y: lerp(172, 228, p) };
      return {
        floorY: 236,
        head: { x: 80, y: 218 },
        torsoHip: { x: 184, y: 227 },
        torsoShoulder: { x: 114, y: 227 },
        clavicleStart: { x: 112, y: 225 },
        clavicleEnd: { x: 118, y: 229 },
        legLeft: [
          { x: 184, y: 227 },
          { x: 186, y: 172 },
          { x: 222, y: 172 },
        ],
        legRight: [{ x: 184, y: 227 }, rKnee, rAnkle],
        footLeft: null,
        footRight: [rAnkle, { x: rAnkle.x + 4, y: rAnkle.y - 10 }],
        leftArm: {
          shoulder: { x: 112, y: 225 },
          elbow: { x: 110, y: 188 },
          hand: { x: 110, y: 152 },
          dumbbellAngleDeg: 0,
        },
        rightArm: {
          shoulder: { x: 118, y: 229 },
          elbow: rElbow,
          hand: rHand,
          dumbbellAngleDeg: 0,
        },
        motionGuidePath: 'M 114 152 Q 74 182 48 226 M 228 172 Q 254 196 266 228',
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
        head: { x: 86, y: 220 - lift * 0.9 },
        torsoHip: { x: 180, y: 228 },
        torsoShoulder: { x: 114, y: 228 - lift * 0.7 },
        clavicleStart: { x: 112, y: 228 - lift * 0.7 },
        clavicleEnd: { x: 116, y: 228 - lift * 0.7 },
        legLeft: [
          { x: 180, y: 228 },
          { x: 222, y: 229 - lift * 0.45 },
          { x: 262, y: 232 - lift * 0.95 },
        ],
        legRight: [
          { x: 180, y: 228 },
          { x: 224, y: 229 - lift * 0.45 },
          { x: 266, y: 232 - lift * 0.95 },
        ],
        footLeft: null,
        footRight: [
          { x: 266, y: 232 - lift * 0.95 },
          { x: 276, y: 230 - lift * 0.95 },
        ],
        leftArm: null,
        rightArm: {
          shoulder: { x: 114, y: 228 - lift * 0.7 },
          elbow: { x: 84, y: 230 - lift * 0.9 },
          hand: { x: 52, y: 231 - lift * 1.1 },
          dumbbellAngleDeg: 0,
        },
        motionGuidePath: 'M 52 231 L 52 202 M 266 232 L 266 207',
      };
    },
  },

  'roller-thoracic': {
    id: 'roller-thoracic',
    label: 'Foam Roller Thoracic Extensions',
    view: 'floor',
    cues: ['Open Chest Over Roller', 'Exhale & Relax', 'Curl Gently Up', 'Support Head Lightly'],
    computePose(p) {
      const shY = lerp(198, 214, p);
      const headX = lerp(94, 78, p);
      const headY = lerp(178, 208, p);
      return {
        floorY: 236,
        head: { x: headX, y: headY },
        torsoHip: { x: 182, y: 227 },
        torsoShoulder: { x: 122, y: shY },
        clavicleStart: { x: 120, y: shY },
        clavicleEnd: { x: 124, y: shY },
        legLeft: [
          { x: 182, y: 227 },
          { x: 214, y: 186 },
          { x: 244, y: 234 },
        ],
        legRight: [
          { x: 182, y: 227 },
          { x: 218, y: 186 },
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
