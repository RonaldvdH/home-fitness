/**
 * Closed double-strand flat elastic resistance band rig for Stage3D.
 * Supports `hands`, `feet-to-hands` (anchored under foot arches), and `ankles` modes
 * with zero per-frame allocations.
 */

import {
  BoxGeometry,
  Color,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type Scene,
} from 'three';
import type { PropSpec3D } from '../../engine/kinematics3d';
import type { MannequinVectors } from './mannequinRig';
import { alignSegment, type ResourceTracker } from './stageHelpers';

export interface BandRig {
  applyBand: (prop: PropSpec3D, vectors: MannequinVectors) => void;
}

export function createBandRig(scene: Scene, tracker: ResourceTracker): BandRig {
  const { trackGeo, trackMat } = tracker;

  const bandRibbonGeo = trackGeo(new BoxGeometry(1, 1, 1));
  const bandMat = trackMat(
    new MeshStandardMaterial({
      color: new Color(0x38bdf8),
      emissive: new Color(0x0284c7),
      emissiveIntensity: 0.35,
      roughness: 0.45,
      metalness: 0.05,
    }),
  );

  const segments: Mesh[] = [];
  for (let i = 0; i < 24; i += 1) {
    const seg = new Mesh(bandRibbonGeo, bandMat);
    seg.visible = false;
    scene.add(seg);
    segments.push(seg);
  }

  // Reusable scratch vectors (zero per-frame allocations)
  const tmpA = new Vector3();
  const tmpB = new Vector3();
  const tmpC = new Vector3();
  const tmpD = new Vector3();
  const tmpE = new Vector3();
  const tmpF = new Vector3();
  const tmpG = new Vector3();
  const tmpH = new Vector3();
  const tmpOff = new Vector3();
  const tmpDir = new Vector3();
  const tmpMid = new Vector3();
  const tmpQuat = new Quaternion();

  const alignRibbon = (
    mesh: Mesh,
    a: Vector3,
    b: Vector3,
    width = 0.022,
    thickness = 0.005,
  ): void => {
    alignSegment(mesh, a, b, 1, tmpDir, tmpMid, tmpQuat);
    if (mesh.visible) {
      mesh.scale.set(width, mesh.scale.y, thickness);
    }
  };

  const applyCurve = (
    startIdx: number,
    segCount: number,
    p0: Vector3,
    ctrl: Vector3,
    p1: Vector3,
  ): void => {
    for (let i = 0; i < segCount; i += 1) {
      const t0 = i / segCount;
      const t1 = (i + 1) / segCount;
      const inv0 = 1 - t0;
      const inv1 = 1 - t1;

      tmpA.set(
        inv0 * inv0 * p0.x + 2 * inv0 * t0 * ctrl.x + t0 * t0 * p1.x,
        inv0 * inv0 * p0.y + 2 * inv0 * t0 * ctrl.y + t0 * t0 * p1.y,
        inv0 * inv0 * p0.z + 2 * inv0 * t0 * ctrl.z + t0 * t0 * p1.z,
      );
      tmpB.set(
        inv1 * inv1 * p0.x + 2 * inv1 * t1 * ctrl.x + t1 * t1 * p1.x,
        inv1 * inv1 * p0.y + 2 * inv1 * t1 * ctrl.y + t1 * t1 * p1.y,
        inv1 * inv1 * p0.z + 2 * inv1 * t1 * ctrl.z + t1 * t1 * p1.z,
      );
      alignRibbon(segments[startIdx + i]!, tmpA, tmpB);
    }
  };

  return {
    applyBand(prop, { vLHd, vRHd, vLAn, vRAn, vLTo, vRTo }) {
      for (const seg of segments) {
        seg.visible = false;
      }
      if (prop.kind !== 'band') return;

      if (prop.mode === 'hands') {
        const span = vLHd.distanceTo(vRHd);
        const sag = Math.max(0, 0.12 - span * 0.1);
        tmpOff.set(0, 0.017, 0);

        tmpE.copy(vLHd).add(tmpOff);
        tmpF.copy(vRHd).add(tmpOff);
        tmpC.addVectors(tmpE, tmpF).multiplyScalar(0.5);
        tmpC.y -= sag;
        applyCurve(0, 8, tmpE, tmpC, tmpF);

        tmpG.copy(vLHd).sub(tmpOff);
        tmpH.copy(vRHd).sub(tmpOff);
        tmpD.addVectors(tmpG, tmpH).multiplyScalar(0.5);
        tmpD.y -= sag;
        applyCurve(8, 8, tmpG, tmpD, tmpH);

        alignRibbon(segments[16]!, tmpE, tmpG);
        alignRibbon(segments[17]!, tmpF, tmpH);
        return;
      }

      if (prop.mode === 'feet-to-hands') {
        const footL = tmpE.lerpVectors(vLAn, vLTo, 0.42).setY(0.015);
        const footR = tmpF.lerpVectors(vRAn, vRTo, 0.42).setY(0.015);
        tmpOff.subVectors(vLTo, vLAn).setY(0);
        if (tmpOff.lengthSq() < 1e-4) tmpOff.set(0, 0, 1);
        else tmpOff.normalize();
        tmpOff.multiplyScalar(0.018);

        // Left front & back strands (foot arch -> left hand)
        tmpG.copy(footL).add(tmpOff);
        tmpH.copy(vLHd).addScaledVector(tmpOff, 0.45);
        tmpC.addVectors(tmpG, tmpH).multiplyScalar(0.5);
        applyCurve(0, 5, tmpG, tmpC, tmpH);

        tmpG.copy(footL).sub(tmpOff);
        tmpH.copy(vLHd).addScaledVector(tmpOff, -0.45);
        tmpC.addVectors(tmpG, tmpH).multiplyScalar(0.5);
        applyCurve(5, 5, tmpG, tmpC, tmpH);

        // Right front & back strands (foot arch -> right hand)
        tmpG.copy(footR).add(tmpOff);
        tmpH.copy(vRHd).addScaledVector(tmpOff, 0.45);
        tmpD.addVectors(tmpG, tmpH).multiplyScalar(0.5);
        applyCurve(10, 5, tmpG, tmpD, tmpH);

        tmpG.copy(footR).sub(tmpOff);
        tmpH.copy(vRHd).addScaledVector(tmpOff, -0.45);
        tmpD.addVectors(tmpG, tmpH).multiplyScalar(0.5);
        applyCurve(15, 5, tmpG, tmpD, tmpH);

        // Flat under-foot bridges + hand wraps to close the loop with zero gaps
        tmpG.copy(footL).add(tmpOff);
        tmpH.copy(footR).add(tmpOff);
        alignRibbon(segments[20]!, tmpG, tmpH);
        tmpG.copy(footL).sub(tmpOff);
        tmpH.copy(footR).sub(tmpOff);
        alignRibbon(segments[21]!, tmpG, tmpH);

        tmpG.copy(vLHd).addScaledVector(tmpOff, 0.45);
        tmpH.copy(vLHd).addScaledVector(tmpOff, -0.45);
        alignRibbon(segments[22]!, tmpG, tmpH);
        tmpG.copy(vRHd).addScaledVector(tmpOff, 0.45);
        tmpH.copy(vRHd).addScaledVector(tmpOff, -0.45);
        alignRibbon(segments[23]!, tmpG, tmpH);
        return;
      }

      // Closed double-strand mini-band loop around both ankles.
      tmpDir.subVectors(vRAn, vLAn);
      tmpOff.set(-tmpDir.z, 0, tmpDir.x);
      if (tmpOff.lengthSq() < 1e-4) tmpOff.set(1, 0, 0);
      else tmpOff.normalize();
      tmpOff.multiplyScalar(0.022);

      tmpE.copy(vLAn).add(tmpOff);
      tmpF.copy(vRAn).add(tmpOff);
      tmpC.addVectors(tmpE, tmpF).multiplyScalar(0.5);
      tmpC.y += 0.025;
      applyCurve(0, 6, tmpE, tmpC, tmpF);

      tmpG.copy(vLAn).sub(tmpOff);
      tmpH.copy(vRAn).sub(tmpOff);
      tmpD.addVectors(tmpG, tmpH).multiplyScalar(0.5);
      tmpD.y += 0.025;
      applyCurve(6, 6, tmpG, tmpD, tmpH);

      alignRibbon(segments[12]!, tmpE, tmpG);
      alignRibbon(segments[13]!, tmpF, tmpH);
    },
  };
}
