/**
 * Shared Three.js geometry/vector helpers and GPU resource tracker for Stage3D.
 */

import { type Mesh, type Quaternion, Vector3 } from 'three';
import type { Vec3 } from '../../engine/kinematics3d';

export const UP_AXIS = new Vector3(0, 1, 0);

export interface ResourceTracker {
  trackGeo: <T extends { dispose: () => void }>(g: T) => T;
  trackMat: <T extends { dispose: () => void }>(m: T) => T;
  disposeAll: () => void;
}

export function createResourceTracker(): ResourceTracker {
  const geometries: Array<{ dispose: () => void }> = [];
  const materials: Array<{ dispose: () => void }> = [];
  return {
    trackGeo<T extends { dispose: () => void }>(g: T): T {
      geometries.push(g);
      return g;
    },
    trackMat<T extends { dispose: () => void }>(m: T): T {
      materials.push(m);
      return m;
    },
    disposeAll() {
      for (const geo of geometries) geo.dispose();
      for (const mat of materials) mat.dispose();
    },
  };
}

export function toVec3(v: Vec3, out: Vector3): Vector3 {
  return out.set(v.x, v.y, v.z);
}

/**
 * Align a unit-height (length = 1 along Y) limb mesh so its endpoints span `a -> b`.
 */
export function alignSegment(
  mesh: Mesh,
  a: Vector3,
  b: Vector3,
  radiusScale: number,
  tmpDir: Vector3,
  tmpMid: Vector3,
  tmpQuat: Quaternion,
): void {
  tmpDir.subVectors(b, a);
  const length = tmpDir.length();
  if (length < 1e-4) {
    mesh.visible = false;
    return;
  }
  mesh.visible = true;
  tmpMid.addVectors(a, b).multiplyScalar(0.5);
  mesh.position.copy(tmpMid);
  tmpDir.divideScalar(length);
  tmpQuat.setFromUnitVectors(UP_AXIS, tmpDir);
  mesh.quaternion.copy(tmpQuat);
  mesh.scale.set(radiusScale, length, radiusScale);
}
