/**
 * 60FPS Articulated Kinematics Engine (requestAnimationFrame)
 * Smoothly interpolates SVG joint coordinates with cubic ease-in-out.
 */

/**
 * Smooth sinusoidal/cubic ease-in-out wave [0 -> 1 -> 0]
 * @param {number} t Normalized cycle time in [0, 1)
 * @returns {number}
 */
export function getSmoothCycle(t) {
  if (t < 0.45) {
    const u = t / 0.45;
    return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  }
  if (t < 0.55) {
    return 1;
  }
  if (t < 0.95) {
    const u = (t - 0.55) / 0.4;
    const ease = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    return 1 - ease;
  }
  return 0;
}

/**
 * Human-readable phase cue for the current point in the rep cycle.
 * @param {number} t Normalized cycle time in [0, 1)
 * @param {string} type Animation template key
 * @returns {string}
 */
export function getCueText(t, type) {
  if (type === 'floor-press') {
    if (t < 0.45) return 'Press Up';
    if (t < 0.55) return 'Lockout Hold';
    if (t < 0.95) return 'Lower to Floor';
    return 'Floor Contact Pause';
  }
  if (t < 0.45) return 'Lift / Drive';
  if (t < 0.55) return 'Peak Squeeze';
  if (t < 0.95) return 'Controlled Lower';
  return 'Reset Position';
}

/**
 * Linear interpolation between a and b.
 */
export function lerp(a, b, p) {
  return a + (b - a) * p;
}

export const KINEMATICS_ENGINE = {
  currentType: 'lateral-raise',
  speedMultiplier: 1.0,
  phaseTime: 0,
  lastTimestamp: 0,
  rafId: null,

  setLine(id, x1, y1, x2, y2) {
    const el = document.getElementById(id);
    if (!el) return;
    el.setAttribute('x1', x1.toFixed(1));
    el.setAttribute('y1', y1.toFixed(1));
    el.setAttribute('x2', x2.toFixed(1));
    el.setAttribute('y2', y2.toFixed(1));
  },

  setDumbbell(id, x, y, angleDeg = 0) {
    const el = document.getElementById(id);
    if (!el) return;
    el.setAttribute(
      'transform',
      `translate(${x.toFixed(1)}, ${y.toFixed(1)}) rotate(${angleDeg.toFixed(1)})`
    );
  },

  renderFrame(progress, rawT) {
    const p = progress;
    const cueEl = document.getElementById('live-rep-cue');
    if (cueEl) cueEl.textContent = getCueText(rawT, this.currentType);

    const backGroup = document.getElementById('limb-back-group');
    const leftArm = document.getElementById('left-upper-arm');
    const leftForearm = document.getElementById('left-forearm');
    const leftJoint = document.getElementById('left-elbow-joint');
    const dbLeft = document.getElementById('dumbbell-left');
    const footL = document.getElementById('foot-left');
    const footR = document.getElementById('foot-right');
    const floorLine = document.getElementById('svg-floor');
    const motionGuide = document.getElementById('svg-motion-guide');

    backGroup.style.display = 'none';
    leftArm.style.display = 'inline';
    leftForearm.style.display = 'inline';
    leftJoint.style.display = 'inline';
    dbLeft.style.display = 'inline';
    footL.style.display = 'inline';
    footR.style.display = 'inline';
    floorLine.setAttribute('y1', '248');
    floorLine.setAttribute('y2', '248');

    switch (this.currentType) {
      case 'overhead-press': {
        document.getElementById('head-circle').setAttribute('cx', '160');
        document.getElementById('head-circle').setAttribute('cy', '62');
        this.setLine('torso-line', 160, 158, 160, 92);
        this.setLine('clavicle-line', 140, 94, 180, 94);
        document.getElementById('leg-left').setAttribute('points', '160,158 144,202 138,246');
        document.getElementById('leg-right').setAttribute('points', '160,158 176,202 182,246');
        this.setLine('foot-left', 128, 246, 142, 246);
        this.setLine('foot-right', 178, 246, 192, 246);

        const lElbowX = lerp(116, 134, p);
        const lElbowY = lerp(116, 60, p);
        const lHandX = lerp(114, 138, p);
        const lHandY = lerp(82, 24, p);

        const rElbowX = lerp(204, 186, p);
        const rElbowY = lerp(116, 60, p);
        const rHandX = lerp(206, 182, p);
        const rHandY = lerp(82, 24, p);

        this.setLine('left-upper-arm', 140, 94, lElbowX, lElbowY);
        this.setLine('left-forearm', lElbowX, lElbowY, lHandX, lHandY);
        leftJoint.setAttribute('cx', lElbowX);
        leftJoint.setAttribute('cy', lElbowY);

        this.setLine('right-upper-arm', 180, 94, rElbowX, rElbowY);
        this.setLine('right-forearm', rElbowX, rElbowY, rHandX, rHandY);
        document.getElementById('right-elbow-joint').setAttribute('cx', rElbowX);
        document.getElementById('right-elbow-joint').setAttribute('cy', rElbowY);

        this.setDumbbell('dumbbell-left', lHandX, lHandY, lerp(-6, 0, p));
        this.setDumbbell('dumbbell-right', rHandX, rHandY, lerp(6, 0, p));
        motionGuide.setAttribute('d', 'M 114 82 Q 124 52 138 24 M 206 82 Q 196 52 182 24');
        break;
      }

      case 'bent-row': {
        leftArm.style.display = 'none';
        leftForearm.style.display = 'none';
        leftJoint.style.display = 'none';
        dbLeft.style.display = 'none';
        footL.style.display = 'none';

        document.getElementById('head-circle').setAttribute('cx', '218');
        document.getElementById('head-circle').setAttribute('cy', '85');
        this.setLine('torso-line', 130, 152, 194, 102);
        this.setLine('clavicle-line', 190, 100, 198, 106);
        document.getElementById('leg-left').setAttribute('points', '130,152 142,198 134,246');
        document.getElementById('leg-right').setAttribute('points', '130,152 146,198 138,246');
        this.setLine('foot-right', 136, 246, 158, 246);

        const elbowX = lerp(192, 154, p);
        const elbowY = lerp(144, 108, p);
        const handX = lerp(192, 166, p);
        const handY = lerp(182, 142, p);

        this.setLine('right-upper-arm', 192, 106, elbowX, elbowY);
        this.setLine('right-forearm', elbowX, elbowY, handX, handY);
        document.getElementById('right-elbow-joint').setAttribute('cx', elbowX);
        document.getElementById('right-elbow-joint').setAttribute('cy', elbowY);

        this.setDumbbell('dumbbell-right', handX, handY, lerp(0, -18, p));
        motionGuide.setAttribute('d', 'M 192 182 Q 176 162 166 142');
        break;
      }

      case 'floor-press': {
        leftArm.style.display = 'none';
        leftForearm.style.display = 'none';
        leftJoint.style.display = 'none';
        dbLeft.style.display = 'none';
        footL.style.display = 'none';

        floorLine.setAttribute('y1', '236');
        floorLine.setAttribute('y2', '236');

        document.getElementById('head-circle').setAttribute('cx', '70');
        document.getElementById('head-circle').setAttribute('cy', '216');
        this.setLine('torso-line', 176, 224, 96, 224);
        this.setLine('clavicle-line', 108, 218, 108, 228);
        document.getElementById('leg-left').setAttribute('points', '176,224 212,174 240,234');
        document.getElementById('leg-right').setAttribute('points', '176,224 216,174 246,234');
        this.setLine('foot-right', 244, 234, 262, 234);

        const elbowX = lerp(86, 108, p);
        const elbowY = lerp(228, 180, p);
        const handX = lerp(90, 108, p);
        const handY = lerp(184, 142, p);

        this.setLine('right-upper-arm', 108, 218, elbowX, elbowY);
        this.setLine('right-forearm', elbowX, elbowY, handX, handY);
        document.getElementById('right-elbow-joint').setAttribute('cx', elbowX);
        document.getElementById('right-elbow-joint').setAttribute('cy', elbowY);

        this.setDumbbell('dumbbell-right', handX, handY, 0);
        motionGuide.setAttribute('d', 'M 90 184 Q 100 162 108 142');
        break;
      }

      case 'bicep-curl': {
        document.getElementById('head-circle').setAttribute('cx', '160');
        document.getElementById('head-circle').setAttribute('cy', '62');
        this.setLine('torso-line', 160, 158, 160, 92);
        this.setLine('clavicle-line', 140, 94, 180, 94);
        document.getElementById('leg-left').setAttribute('points', '160,158 144,202 138,246');
        document.getElementById('leg-right').setAttribute('points', '160,158 176,202 182,246');
        this.setLine('foot-left', 128, 246, 142, 246);
        this.setLine('foot-right', 178, 246, 192, 246);

        const lElbowX = lerp(134, 132, p);
        const lElbowY = lerp(134, 130, p);
        const lHandX = lerp(130, 138, p);
        const lHandY = lerp(174, 96, p);

        const rElbowX = lerp(186, 188, p);
        const rElbowY = lerp(134, 130, p);
        const rHandX = lerp(190, 182, p);
        const rHandY = lerp(174, 96, p);

        this.setLine('left-upper-arm', 140, 94, lElbowX, lElbowY);
        this.setLine('left-forearm', lElbowX, lElbowY, lHandX, lHandY);
        leftJoint.setAttribute('cx', lElbowX);
        leftJoint.setAttribute('cy', lElbowY);

        this.setLine('right-upper-arm', 180, 94, rElbowX, rElbowY);
        this.setLine('right-forearm', rElbowX, rElbowY, rHandX, rHandY);
        document.getElementById('right-elbow-joint').setAttribute('cx', rElbowX);
        document.getElementById('right-elbow-joint').setAttribute('cy', rElbowY);

        this.setDumbbell('dumbbell-left', lHandX, lHandY, lerp(8, -12, p));
        this.setDumbbell('dumbbell-right', rHandX, rHandY, lerp(-8, 12, p));
        motionGuide.setAttribute('d', 'M 130 174 A 40 40 0 0 1 138 96 M 190 174 A 40 40 0 0 0 182 96');
        break;
      }

      case 'lateral-raise': {
        document.getElementById('head-circle').setAttribute('cx', '160');
        document.getElementById('head-circle').setAttribute('cy', '62');
        this.setLine('torso-line', 160, 158, 160, 92);
        this.setLine('clavicle-line', 140, 94, 180, 94);
        document.getElementById('leg-left').setAttribute('points', '160,158 144,202 138,246');
        document.getElementById('leg-right').setAttribute('points', '160,158 176,202 182,246');
        this.setLine('foot-left', 128, 246, 142, 246);
        this.setLine('foot-right', 178, 246, 192, 246);

        const angleL = lerp(Math.PI * 0.56, Math.PI * 1.02, p);
        const angleR = lerp(Math.PI * 0.44, -Math.PI * 0.02, p);

        const lElbowX = 140 + Math.cos(angleL) * 38;
        const lElbowY = 94 + Math.sin(angleL) * 38;
        const lHandX = 140 + Math.cos(angleL - 0.08) * 74;
        const lHandY = 94 + Math.sin(angleL - 0.08) * 74;

        const rElbowX = 180 + Math.cos(angleR) * 38;
        const rElbowY = 94 + Math.sin(angleR) * 38;
        const rHandX = 180 + Math.cos(angleR + 0.08) * 74;
        const rHandY = 94 + Math.sin(angleR + 0.08) * 74;

        this.setLine('left-upper-arm', 140, 94, lElbowX, lElbowY);
        this.setLine('left-forearm', lElbowX, lElbowY, lHandX, lHandY);
        leftJoint.setAttribute('cx', lElbowX);
        leftJoint.setAttribute('cy', lElbowY);

        this.setLine('right-upper-arm', 180, 94, rElbowX, rElbowY);
        this.setLine('right-forearm', rElbowX, rElbowY, rHandX, rHandY);
        document.getElementById('right-elbow-joint').setAttribute('cx', rElbowX);
        document.getElementById('right-elbow-joint').setAttribute('cy', rElbowY);

        this.setDumbbell('dumbbell-left', lHandX, lHandY, lerp(80, 0, p));
        this.setDumbbell('dumbbell-right', rHandX, rHandY, lerp(-80, 0, p));
        motionGuide.setAttribute('d', 'M 126 166 A 74 74 0 0 1 66 90 M 194 166 A 74 74 0 0 0 254 90');
        break;
      }

      case 'front-raise': {
        leftArm.style.display = 'none';
        leftForearm.style.display = 'none';
        leftJoint.style.display = 'none';
        dbLeft.style.display = 'none';
        footL.style.display = 'none';

        document.getElementById('head-circle').setAttribute('cx', '160');
        document.getElementById('head-circle').setAttribute('cy', '62');
        this.setLine('torso-line', 160, 158, 160, 92);
        this.setLine('clavicle-line', 156, 94, 164, 94);
        document.getElementById('leg-left').setAttribute('points', '160,158 156,202 154,246');
        document.getElementById('leg-right').setAttribute('points', '160,158 162,202 160,246');
        this.setLine('foot-right', 158, 246, 178, 246);

        const angle = lerp(Math.PI * 0.48, 0, p);
        const elbowX = 160 + Math.cos(angle) * 38;
        const elbowY = 96 + Math.sin(angle) * 38;
        const handX = 160 + Math.cos(angle - 0.06) * 74;
        const handY = 96 + Math.sin(angle - 0.06) * 74;

        this.setLine('right-upper-arm', 160, 96, elbowX, elbowY);
        this.setLine('right-forearm', elbowX, elbowY, handX, handY);
        document.getElementById('right-elbow-joint').setAttribute('cx', elbowX);
        document.getElementById('right-elbow-joint').setAttribute('cy', elbowY);
        this.setDumbbell('dumbbell-right', handX, handY, lerp(90, 0, p));
        motionGuide.setAttribute('d', 'M 164 170 A 74 74 0 0 0 234 92');
        break;
      }

      case 'tricep-extension': {
        document.getElementById('head-circle').setAttribute('cx', '160');
        document.getElementById('head-circle').setAttribute('cy', '64');
        this.setLine('torso-line', 160, 158, 160, 94);
        this.setLine('clavicle-line', 142, 96, 178, 96);
        document.getElementById('leg-left').setAttribute('points', '160,158 144,202 138,246');
        document.getElementById('leg-right').setAttribute('points', '160,158 176,202 182,246');
        this.setLine('foot-left', 128, 246, 142, 246);
        this.setLine('foot-right', 178, 246, 192, 246);

        const lHandX = lerp(150, 148, p);
        const lHandY = lerp(82, 22, p);
        const rHandX = lerp(170, 172, p);
        const rHandY = lerp(82, 22, p);

        this.setLine('left-upper-arm', 142, 96, 144, 52);
        this.setLine('left-forearm', 144, 52, lHandX, lHandY);
        leftJoint.setAttribute('cx', 144);
        leftJoint.setAttribute('cy', 52);

        this.setLine('right-upper-arm', 178, 96, 176, 52);
        this.setLine('right-forearm', 176, 52, rHandX, rHandY);
        document.getElementById('right-elbow-joint').setAttribute('cx', 176);
        document.getElementById('right-elbow-joint').setAttribute('cy', 52);

        this.setDumbbell('dumbbell-left', lHandX, lHandY, 0);
        this.setDumbbell('dumbbell-right', rHandX, rHandY, 0);
        motionGuide.setAttribute('d', 'M 148 82 L 148 22 M 172 82 L 172 22');
        break;
      }

      case 'squat': {
        const hipY = lerp(158, 198, p);
        const shoulderY = lerp(92, 134, p);
        const headY = lerp(62, 104, p);
        const kneeOut = lerp(16, 30, p);

        document.getElementById('head-circle').setAttribute('cx', '160');
        document.getElementById('head-circle').setAttribute('cy', headY);
        this.setLine('torso-line', 160, hipY, 160, shoulderY);
        this.setLine('clavicle-line', 140, shoulderY + 2, 180, shoulderY + 2);
        document
          .getElementById('leg-left')
          .setAttribute('points', `160,${hipY} ${160 - kneeOut},${lerp(202, 204, p)} 138,246`);
        document
          .getElementById('leg-right')
          .setAttribute('points', `160,${hipY} ${160 + kneeOut},${lerp(202, 204, p)} 182,246`);
        this.setLine('foot-left', 128, 246, 142, 246);
        this.setLine('foot-right', 178, 246, 192, 246);

        this.setLine('left-upper-arm', 140, shoulderY + 2, 132, shoulderY + 38);
        this.setLine('left-forearm', 132, shoulderY + 38, 130, shoulderY + 72);
        leftJoint.setAttribute('cx', 132);
        leftJoint.setAttribute('cy', shoulderY + 38);

        this.setLine('right-upper-arm', 180, shoulderY + 2, 188, shoulderY + 38);
        this.setLine('right-forearm', 188, shoulderY + 38, 190, shoulderY + 72);
        document.getElementById('right-elbow-joint').setAttribute('cx', 188);
        document.getElementById('right-elbow-joint').setAttribute('cy', shoulderY + 38);

        this.setDumbbell('dumbbell-left', 130, shoulderY + 72, 0);
        this.setDumbbell('dumbbell-right', 190, shoulderY + 72, 0);
        motionGuide.setAttribute('d', 'M 130 164 L 130 206 M 190 164 L 190 206');
        break;
      }

      default: {
        // 'rdl' - Romanian Deadlift (Hip Hinge)
        leftArm.style.display = 'none';
        leftForearm.style.display = 'none';
        leftJoint.style.display = 'none';
        dbLeft.style.display = 'none';
        footL.style.display = 'none';

        const hipX = lerp(160, 132, p);
        const hipY = lerp(158, 154, p);
        const shX = lerp(160, 198, p);
        const shY = lerp(92, 118, p);
        const hdX = lerp(160, 224, p);
        const hdY = lerp(62, 108, p);

        document.getElementById('head-circle').setAttribute('cx', hdX);
        document.getElementById('head-circle').setAttribute('cy', hdY);
        this.setLine('torso-line', hipX, hipY, shX, shY);
        this.setLine('clavicle-line', shX - 4, shY, shX + 4, shY + 2);
        document.getElementById('leg-left').setAttribute('points', `${hipX},${hipY} 154,202 150,246`);
        document.getElementById('leg-right').setAttribute('points', `${hipX},${hipY} 158,202 154,246`);
        this.setLine('foot-right', 152, 246, 174, 246);

        this.setLine('right-upper-arm', shX, shY + 4, shX - 2, shY + 42);
        this.setLine('right-forearm', shX - 2, shY + 42, shX - 2, shY + 80);
        document.getElementById('right-elbow-joint').setAttribute('cx', shX - 2);
        document.getElementById('right-elbow-joint').setAttribute('cy', shY + 42);
        this.setDumbbell('dumbbell-right', shX - 2, shY + 80, 0);
        motionGuide.setAttribute('d', 'M 158 172 Q 180 186 196 198');
        break;
      }
    }
  },

  loop(timestamp) {
    if (!this.lastTimestamp) this.lastTimestamp = timestamp;
    const dt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    const cycleDuration = 3.2 / this.speedMultiplier;
    this.phaseTime = (this.phaseTime + dt) % cycleDuration;
    const rawT = this.phaseTime / cycleDuration;
    const smoothP = getSmoothCycle(rawT);

    this.renderFrame(smoothP, rawT);
    this.rafId = requestAnimationFrame((ts) => this.loop(ts));
  },

  start(type) {
    if (type) this.currentType = type;
    if (!this.rafId) {
      this.lastTimestamp = 0;
      this.rafId = requestAnimationFrame((ts) => this.loop(ts));
    }
  },

  setExerciseType(type) {
    this.currentType = type || 'overhead-press';
  },
};
