/**
 * Pure 2D SVG pose definitions for Phase 5 Pilates & Mobility animations.
 * Zero DOM or Preact dependencies.
 */

import type { AnimationId } from '../../domain/schema';
import { lerp, type AnimationDefinition } from './math';

export const PILATES_MOBILITY_ANIMATIONS: Partial<Record<AnimationId, AnimationDefinition>> = {
  'pilates-hundred': {
    id: 'pilates-hundred',
    label: 'The Hundred (Pilates Mat)',
    view: 'floor',
    cues: ['Pump Arms Crisp', 'Hold Scoop', 'Steady Rhythm', 'Imprint Spine'],
    breathCues: ['Inhale 5 Beats', 'Inhale Full', 'Exhale 5 Beats', 'Exhale Deep'],
    computePose: (p) => {
      const pumpY = lerp(206, 224, p);
      return {
        floorY: 236,
        head: { x: 84, y: 174 },
        torsoHip: { x: 162, y: 224 },
        torsoShoulder: { x: 106, y: 192 },
        clavicleStart: { x: 104, y: 192 },
        clavicleEnd: { x: 112, y: 194 },
        legLeft: [
          { x: 162, y: 224 },
          { x: 204, y: 186 },
          { x: 244, y: 150 },
        ],
        legRight: [
          { x: 162, y: 224 },
          { x: 208, y: 190 },
          { x: 248, y: 156 },
        ],
        footLeft: [
          { x: 244, y: 150 },
          { x: 254, y: 144 },
        ],
        footRight: [
          { x: 248, y: 156 },
          { x: 258, y: 150 },
        ],
        leftArm: null,
        rightArm: {
          shoulder: { x: 108, y: 194 },
          elbow: { x: 146, y: lerp(202, 212, p) },
          hand: { x: 184, y: pumpY },
          dumbbellAngleDeg: 0,
        },
        motionGuidePath: 'M 184 206 L 184 224',
      };
    },
  },

  'single-leg-stretch': {
    id: 'single-leg-stretch',
    label: 'Single-Leg Stretch (Pilates)',
    view: 'floor',
    cues: ['Switch & Extend', 'Hug Knee In', 'Glide Smoothly', 'Brace Core'],
    breathCues: ['Exhale Switch', 'Exhale Scoop', 'Inhale Glide', 'Inhale Prepare'],
    computePose: (p) => {
      const knee1X = lerp(136, 206, p);
      const knee1Y = lerp(176, 198, p);
      const foot1X = lerp(158, 254, p);
      const foot1Y = lerp(202, 180, p);

      const knee2X = lerp(206, 136, p);
      const knee2Y = lerp(198, 176, p);
      const foot2X = lerp(254, 158, p);
      const foot2Y = lerp(180, 202, p);

      const handX = lerp(142, 146, p);
      const handY = lerp(178, 180, p);

      return {
        floorY: 236,
        head: { x: 84, y: 174 },
        torsoHip: { x: 162, y: 224 },
        torsoShoulder: { x: 106, y: 192 },
        clavicleStart: { x: 104, y: 192 },
        clavicleEnd: { x: 112, y: 194 },
        legLeft: [
          { x: 162, y: 224 },
          { x: knee2X, y: knee2Y },
          { x: foot2X, y: foot2Y },
        ],
        legRight: [
          { x: 162, y: 224 },
          { x: knee1X, y: knee1Y },
          { x: foot1X, y: foot1Y },
        ],
        footLeft: [
          { x: foot2X, y: foot2Y },
          { x: foot2X + 10, y: foot2Y - 4 },
        ],
        footRight: [
          { x: foot1X, y: foot1Y },
          { x: foot1X + 10, y: foot1Y - 4 },
        ],
        leftArm: null,
        rightArm: {
          shoulder: { x: 108, y: 194 },
          elbow: { x: 126, y: 204 },
          hand: { x: handX, y: handY },
          dumbbellAngleDeg: 0,
        },
        motionGuidePath: 'M 158 202 Q 208 184 254 180',
      };
    },
  },

  'swan-prep': {
    id: 'swan-prep',
    label: 'Swan Prep (Prone Extension)',
    view: 'floor',
    cues: ['Lengthen & Lift', 'Open Collarbones', 'Lower Smoothly', 'Anchor Pelvis'],
    breathCues: ['Inhale Lift', 'Inhale Lengthen', 'Exhale Lower', 'Exhale Soften'],
    computePose: (p) => {
      const shY = lerp(224, 174, p);
      const headY = lerp(218, 152, p);
      const elbowY = lerp(222, 206, p);
      return {
        floorY: 236,
        head: { x: lerp(228, 224, p), y: headY },
        torsoHip: { x: 148, y: 228 },
        torsoShoulder: { x: lerp(206, 202, p), y: shY },
        clavicleStart: { x: lerp(202, 198, p), y: shY },
        clavicleEnd: { x: lerp(210, 206, p), y: shY },
        legLeft: [
          { x: 148, y: 228 },
          { x: 106, y: 230 },
          { x: 64, y: 232 },
        ],
        legRight: [
          { x: 148, y: 228 },
          { x: 106, y: 230 },
          { x: 64, y: 232 },
        ],
        footLeft: null,
        footRight: [
          { x: 64, y: 232 },
          { x: 54, y: 226 },
        ],
        leftArm: null,
        rightArm: {
          shoulder: { x: lerp(206, 202, p), y: shY },
          elbow: { x: lerp(186, 196, p), y: elbowY },
          hand: { x: 204, y: 234 },
          dumbbellAngleDeg: 0,
        },
        motionGuidePath: 'M 206 224 Q 214 198 202 174',
      };
    },
  },

  'side-leg-lift': {
    id: 'side-leg-lift',
    label: 'Side-Lying Leg Lift (Pilates)',
    view: 'floor',
    cues: ['Reach & Lift', 'Hold Glute Medius', 'Lower With Control', 'Stack Hips'],
    breathCues: ['Exhale Lift', 'Exhale Hold', 'Inhale Lower', 'Inhale Align'],
    computePose: (p) => {
      const kneeY = lerp(226, 186, p);
      const footY = lerp(228, 148, p);
      return {
        floorY: 236,
        head: { x: 74, y: 214 },
        torsoHip: { x: 156, y: 226 },
        torsoShoulder: { x: 102, y: 222 },
        clavicleStart: { x: 100, y: 222 },
        clavicleEnd: { x: 106, y: 222 },
        legLeft: [
          { x: 156, y: 228 },
          { x: 206, y: 230 },
          { x: 256, y: 232 },
        ],
        legRight: [
          { x: 156, y: 224 },
          { x: lerp(206, 202, p), y: kneeY },
          { x: lerp(256, 246, p), y: footY },
        ],
        footLeft: [
          { x: 256, y: 232 },
          { x: 262, y: 222 },
        ],
        footRight: [
          { x: lerp(256, 246, p), y: footY },
          { x: lerp(262, 250, p), y: footY - 10 },
        ],
        leftArm: null,
        rightArm: {
          shoulder: { x: 102, y: 222 },
          elbow: { x: 122, y: 208 },
          hand: { x: 136, y: 232 },
          dumbbellAngleDeg: 0,
        },
        motionGuidePath: 'M 256 228 Q 262 188 246 148',
      };
    },
  },

  'spine-twist': {
    id: 'spine-twist',
    label: 'Seated Spine Twist (Pilates)',
    view: 'front',
    cues: ['Grow Tall & Rotate', 'Pulse Thoracic', 'Return to Center', 'Anchor Sit Bones'],
    breathCues: ['Exhale Twist', 'Exhale Lengthen', 'Inhale Center', 'Inhale Grow Tall'],
    computePose: (p) => {
      const twist = lerp(-1, 1, p);
      const lHandX = 160 - 76 + twist * 18;
      const rHandX = 160 + 76 - twist * 18;
      const lElbowX = 160 - 40 + twist * 10;
      const rElbowX = 160 + 40 - twist * 10;
      return {
        floorY: 236,
        head: { x: 160 + twist * 4, y: 112 },
        torsoHip: { x: 160, y: 224 },
        torsoShoulder: { x: 160, y: 146 },
        clavicleStart: { x: 138 + twist * 6, y: 148 },
        clavicleEnd: { x: 182 - twist * 6, y: 148 },
        legLeft: [
          { x: 152, y: 224 },
          { x: 126, y: 230 },
          { x: 104, y: 232 },
        ],
        legRight: [
          { x: 168, y: 224 },
          { x: 194, y: 230 },
          { x: 216, y: 232 },
        ],
        footLeft: [
          { x: 104, y: 232 },
          { x: 96, y: 224 },
        ],
        footRight: [
          { x: 216, y: 232 },
          { x: 224, y: 224 },
        ],
        leftArm: {
          shoulder: { x: 138 + twist * 6, y: 148 },
          elbow: { x: lElbowX, y: 150 },
          hand: { x: lHandX, y: 150 },
          dumbbellAngleDeg: 0,
        },
        rightArm: {
          shoulder: { x: 182 - twist * 6, y: 148 },
          elbow: { x: rElbowX, y: 150 },
          hand: { x: rHandX, y: 150 },
          dumbbellAngleDeg: 0,
        },
        motionGuidePath: 'M 84 150 Q 160 132 236 150',
      };
    },
  },

  'clam-shell': {
    id: 'clam-shell',
    label: 'Banded Clam Shells (Pilates)',
    view: 'floor',
    cues: ['Open Top Knee', 'Pause Against Band', 'Lower Slowly', 'Keep Heels Together'],
    breathCues: ['Exhale Open', 'Exhale Squeeze', 'Inhale Close', 'Inhale Stack Hips'],
    computePose: (p) => {
      const topKneeY = lerp(220, 174, p);
      const topKneeX = lerp(206, 198, p);
      return {
        floorY: 236,
        head: { x: 76, y: 214 },
        torsoHip: { x: 158, y: 224 },
        torsoShoulder: { x: 104, y: 220 },
        clavicleStart: { x: 102, y: 220 },
        clavicleEnd: { x: 108, y: 220 },
        legLeft: [
          { x: 158, y: 226 },
          { x: 206, y: 224 },
          { x: 184, y: 234 },
        ],
        legRight: [
          { x: 158, y: 222 },
          { x: topKneeX, y: topKneeY },
          { x: 184, y: 232 },
        ],
        footLeft: [
          { x: 184, y: 234 },
          { x: 176, y: 234 },
        ],
        footRight: [
          { x: 184, y: 232 },
          { x: 176, y: 232 },
        ],
        leftArm: null,
        rightArm: {
          shoulder: { x: 104, y: 220 },
          elbow: { x: 124, y: 208 },
          hand: { x: 138, y: 232 },
          dumbbellAngleDeg: 0,
        },
        motionGuidePath: 'M 206 220 Q 214 196 198 174',
      };
    },
  },

  swimming: {
    id: 'swimming',
    label: 'Pilates Swimming (Prone Flutter)',
    view: 'floor',
    cues: ['Lift Opposite Limbs', 'Flutter Smoothly', 'Switch Sides', 'Lengthen Spine'],
    breathCues: ['Inhale 4 Beats', 'Inhale Long', 'Exhale 4 Beats', 'Exhale Steady'],
    computePose: (p) => {
      const rArmY = lerp(218, 192, p);
      const lLegY = lerp(226, 200, p);
      const rLegY = lerp(200, 226, p);
      return {
        floorY: 236,
        head: { x: 212, y: 206 },
        torsoHip: { x: 146, y: 226 },
        torsoShoulder: { x: 194, y: 216 },
        clavicleStart: { x: 190, y: 216 },
        clavicleEnd: { x: 198, y: 216 },
        legLeft: [
          { x: 146, y: 226 },
          { x: 102, y: lerp(226, 212, p) },
          { x: 60, y: lLegY },
        ],
        legRight: [
          { x: 146, y: 226 },
          { x: 102, y: lerp(212, 226, p) },
          { x: 60, y: rLegY },
        ],
        footLeft: [
          { x: 60, y: lLegY },
          { x: 50, y: lLegY - 2 },
        ],
        footRight: [
          { x: 60, y: rLegY },
          { x: 50, y: rLegY - 2 },
        ],
        leftArm: {
          shoulder: { x: 192, y: 216 },
          elbow: { x: 228, y: lerp(196, 218, p) },
          hand: { x: 262, y: lerp(192, 218, p) },
          dumbbellAngleDeg: 0,
        },
        rightArm: {
          shoulder: { x: 196, y: 216 },
          elbow: { x: 228, y: lerp(218, 196, p) },
          hand: { x: 262, y: rArmY },
          dumbbellAngleDeg: 0,
        },
        motionGuidePath: 'M 262 218 L 262 192 M 60 226 L 60 200',
      };
    },
  },

  'cat-cow': {
    id: 'cat-cow',
    label: 'Cat-Cow Spinal Flow (Mobility)',
    view: 'floor',
    cues: ['Round Spine (Cat)', 'Press Floor Away', 'Arch Gently (Cow)', 'Broaden Chest'],
    breathCues: ['Exhale Round (Cat)', 'Exhale Empty', 'Inhale Arch (Cow)', 'Inhale Open'],
    computePose: (p) => {
      const shY = lerp(170, 152, p);
      const hipY = lerp(170, 158, p);
      const headY = lerp(156, 178, p);
      return {
        floorY: 236,
        head: { x: 224, y: headY },
        torsoHip: { x: 126, y: hipY },
        torsoShoulder: { x: 196, y: shY },
        clavicleStart: { x: 192, y: shY },
        clavicleEnd: { x: 200, y: shY },
        legLeft: [
          { x: 126, y: hipY },
          { x: 126, y: 232 },
          { x: 92, y: 234 },
        ],
        legRight: [
          { x: 126, y: hipY },
          { x: 126, y: 232 },
          { x: 92, y: 234 },
        ],
        footLeft: null,
        footRight: [
          { x: 92, y: 234 },
          { x: 84, y: 234 },
        ],
        leftArm: null,
        rightArm: {
          shoulder: { x: 196, y: shY },
          elbow: { x: 198, y: lerp(202, 194, p) },
          hand: { x: 198, y: 234 },
          dumbbellAngleDeg: 0,
        },
        motionGuidePath: 'M 160 174 Q 160 148 160 154',
      };
    },
  },

  'worlds-greatest-stretch': {
    id: 'worlds-greatest-stretch',
    label: "World's Greatest Stretch (Mobility)",
    view: 'floor',
    cues: ['Rotate Chest Open', 'Reach Skyward', 'Return Elbow Down', 'Sink Hips Gently'],
    breathCues: ['Inhale Open', 'Inhale Reach', 'Exhale Return', 'Exhale Sink'],
    computePose: (p) => {
      const handX = lerp(188, 176, p);
      const handY = lerp(226, 108, p);
      const elbowX = lerp(192, 182, p);
      const elbowY = lerp(204, 140, p);
      return {
        floorY: 236,
        head: { x: 212, y: lerp(164, 152, p) },
        torsoHip: { x: 148, y: 196 },
        torsoShoulder: { x: 190, y: lerp(176, 168, p) },
        clavicleStart: { x: 186, y: lerp(176, 168, p) },
        clavicleEnd: { x: 194, y: lerp(176, 168, p) },
        legLeft: [
          { x: 148, y: 196 },
          { x: 106, y: 216 },
          { x: 66, y: 234 },
        ],
        legRight: [
          { x: 148, y: 196 },
          { x: 194, y: 186 },
          { x: 198, y: 234 },
        ],
        footLeft: [
          { x: 66, y: 234 },
          { x: 58, y: 226 },
        ],
        footRight: [
          { x: 198, y: 234 },
          { x: 212, y: 234 },
        ],
        leftArm: {
          shoulder: { x: 188, y: lerp(176, 168, p) },
          elbow: { x: 182, y: 204 },
          hand: { x: 178, y: 234 },
          dumbbellAngleDeg: 0,
        },
        rightArm: {
          shoulder: { x: 192, y: lerp(176, 168, p) },
          elbow: { x: elbowX, y: elbowY },
          hand: { x: handX, y: handY },
          dumbbellAngleDeg: 0,
        },
        motionGuidePath: 'M 188 226 Q 214 166 176 108',
      };
    },
  },

  'childs-pose': {
    id: 'childs-pose',
    label: "Child's Pose Breathing (Recovery)",
    view: 'floor',
    cues: ['Expand Back Ribs', 'Soften Shoulders', 'Melt Hips Back', 'Long Slow Exhale'],
    breathCues: ['Inhale Back Ribs', 'Inhale Full', 'Exhale Melt', 'Exhale Release'],
    computePose: (p) => {
      const shY = lerp(218, 210, p);
      const handX = lerp(246, 254, p);
      return {
        floorY: 236,
        head: { x: 202, y: lerp(224, 220, p) },
        torsoHip: { x: 112, y: 216 },
        torsoShoulder: { x: 178, y: shY },
        clavicleStart: { x: 174, y: shY },
        clavicleEnd: { x: 182, y: shY },
        legLeft: [
          { x: 112, y: 216 },
          { x: 146, y: 232 },
          { x: 96, y: 234 },
        ],
        legRight: [
          { x: 112, y: 216 },
          { x: 146, y: 232 },
          { x: 96, y: 234 },
        ],
        footLeft: null,
        footRight: [
          { x: 96, y: 234 },
          { x: 86, y: 234 },
        ],
        leftArm: null,
        rightArm: {
          shoulder: { x: 178, y: shY },
          elbow: { x: 214, y: 226 },
          hand: { x: handX, y: 234 },
          dumbbellAngleDeg: 0,
        },
        motionGuidePath: 'M 178 218 L 178 210',
      };
    },
  },
};
