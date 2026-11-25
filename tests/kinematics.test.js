import { describe, it, expect } from 'vitest';
import { getCueText, getSmoothCycle, lerp } from '../src/engine/kinematics.js';

describe('kinematics math helpers', () => {
  it('interpolates linearly with lerp', () => {
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 0.5)).toBe(15);
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it('produces a smooth 0 -> 1 -> 0 rep cycle', () => {
    expect(getSmoothCycle(0)).toBe(0);
    expect(getSmoothCycle(0.5)).toBe(1);
    expect(getSmoothCycle(0.97)).toBe(0);
    expect(getSmoothCycle(0.225)).toBeCloseTo(0.5, 4);
  });

  it('returns exercise-specific cue text', () => {
    expect(getCueText(0.2, 'floor-press')).toBe('Press Up');
    expect(getCueText(0.5, 'floor-press')).toBe('Lockout Hold');
    expect(getCueText(0.2, 'overhead-press')).toBe('Lift / Drive');
    expect(getCueText(0.7, 'overhead-press')).toBe('Controlled Lower');
  });
});
