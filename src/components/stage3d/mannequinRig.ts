/**
 * Procedural stylized articulated 3D mannequin rig with dynamic anatomical muscle materials.
 * Mutates GPU transforms in-place with zero per-frame allocations.
 */

import {
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
  type Scene,
} from 'three';
import type { RigPose3D } from '../../engine/kinematics3d';
import {
  BODY_REGIONS,
  getRegionColorSpec,
  type BodyRegion,
  type MuscleHighlightMap,
} from '../../engine/muscleHighlights';
import { alignSegment, toVec3, type ResourceTracker } from './stageHelpers';

export interface MannequinVectors {
  vLHd: Vector3;
  vRHd: Vector3;
  vLAn: Vector3;
  vRAn: Vector3;
}

export interface MannequinRig {
  syncHighlights: (highlights: MuscleHighlightMap) => void;
  applyPose: (pose: RigPose3D, highlights: MuscleHighlightMap, progress: number) => void;
  vectors: MannequinVectors;
}

export function createMannequinRig(
  scene: Scene,
  tracker: ResourceTracker,
  unitCylinderGeo: CylinderGeometry,
  unitJointGeo: SphereGeometry,
  initialHighlights: MuscleHighlightMap,
): MannequinRig {
  const { trackGeo, trackMat } = tracker;

  const mannequinGroup = new Group();
  scene.add(mannequinGroup);

  const createRegionMaterial = (region: BodyRegion): MeshStandardMaterial => {
    const spec = getRegionColorSpec(region, 'neutral');
    return trackMat(
      new MeshStandardMaterial({
        color: new Color(spec.colorInt),
        emissive: new Color(0x000000),
        emissiveIntensity: 0,
        roughness: 0.38,
        metalness: 0.14,
      }),
    );
  };

  const regionMaterials: Record<BodyRegion, MeshStandardMaterial> = {
    shoulders: createRegionMaterial('shoulders'),
    upperArms: createRegionMaterial('upperArms'),
    forearms: createRegionMaterial('forearms'),
    chestBack: createRegionMaterial('chestBack'),
    core: createRegionMaterial('core'),
    glutes: createRegionMaterial('glutes'),
    thighs: createRegionMaterial('thighs'),
    calves: createRegionMaterial('calves'),
  };

  const headNeutralMat = trackMat(
    new MeshStandardMaterial({
      color: new Color(0xe2e8f0),
      roughness: 0.36,
      metalness: 0.14,
    }),
  );
  const chestAccentMat = trackMat(
    new MeshStandardMaterial({
      color: new Color(0x334155),
      roughness: 0.48,
      metalness: 0.18,
    }),
  );
  const shoeMat = trackMat(
    new MeshStandardMaterial({
      color: new Color(0xf1f5f9),
      roughness: 0.38,
      metalness: 0.1,
    }),
  );
  const handMat = trackMat(
    new MeshStandardMaterial({
      color: new Color(0xf8fafc),
      roughness: 0.36,
      metalness: 0.1,
    }),
  );
  const visorMat = trackMat(
    new MeshStandardMaterial({
      color: new Color(0x0f172a),
      emissive: new Color(0x10b981),
      emissiveIntensity: 0.28,
      roughness: 0.2,
      metalness: 0.5,
    }),
  );

  const syncHighlights = (highlights: MuscleHighlightMap): void => {
    for (const region of BODY_REGIONS) {
      const level = highlights[region];
      const spec = getRegionColorSpec(region, level);
      const mat = regionMaterials[region];
      mat.color.setHex(spec.colorInt);
      mat.emissive.setHex(spec.emissiveInt);
      mat.emissiveIntensity = spec.baseEmissive;
    }
  };

  const pulseRegionEmissive = (highlights: MuscleHighlightMap, progress: number): void => {
    for (const region of BODY_REGIONS) {
      const level = highlights[region];
      if (level === 'neutral') continue;
      const spec = getRegionColorSpec(region, level);
      regionMaterials[region].emissiveIntensity =
        spec.baseEmissive + (spec.peakEmissive - spec.baseEmissive) * progress;
    }
  };

  syncHighlights(initialHighlights);

  // Head + visor so facing direction reads crisply.
  const headGroup = new Group();
  const headSphereGeo = trackGeo(new SphereGeometry(0.105, 24, 18));
  const headMesh = new Mesh(headSphereGeo, headNeutralMat);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  const visorGeo = trackGeo(new CapsuleGeometry(0.017, 0.085, 6, 12));
  const visorMesh = new Mesh(visorGeo, visorMat);
  visorMesh.rotation.z = Math.PI / 2;
  visorMesh.position.set(0, 0.014, 0.09);
  headGroup.add(visorMesh);
  mannequinGroup.add(headGroup);

  const neckMesh = new Mesh(unitCylinderGeo, headNeutralMat);
  neckMesh.castShadow = true;
  mannequinGroup.add(neckMesh);

  // Sculpted athletic upper torso (chest & upper back region).
  const chestGroup = new Group();
  const chestGeo = trackGeo(new CapsuleGeometry(0.106, 0.115, 10, 20));
  const chestMesh = new Mesh(chestGeo, regionMaterials.chestBack);
  chestMesh.scale.set(1.48, 1, 0.84);
  chestMesh.castShadow = true;
  chestGroup.add(chestMesh);

  const chestStripeGeo = trackGeo(new CylinderGeometry(0.108, 0.108, 0.022, 24));
  const chestStripe = new Mesh(chestStripeGeo, chestAccentMat);
  chestStripe.scale.set(1.49, 1, 0.85);
  chestStripe.position.set(0, 0.052, 0);
  chestGroup.add(chestStripe);
  mannequinGroup.add(chestGroup);

  // Distinct sculpted midsection/core band (abs, obliques & lower back).
  const coreGroup = new Group();
  const coreGeo = trackGeo(new CylinderGeometry(0.104, 0.098, 0.165, 20));
  const coreMesh = new Mesh(coreGeo, regionMaterials.core);
  coreMesh.scale.set(1.22, 1, 0.78);
  coreMesh.castShadow = true;
  coreGroup.add(coreMesh);
  mannequinGroup.add(coreGroup);

  // Rounded athletic pelvis/glutes capsule.
  const pelvisGroup = new Group();
  const pelvisGeo = trackGeo(new CapsuleGeometry(0.088, 0.105, 8, 18));
  const pelvisMesh = new Mesh(pelvisGeo, regionMaterials.glutes);
  pelvisMesh.rotation.z = Math.PI / 2;
  pelvisMesh.scale.set(1, 1, 0.94);
  pelvisMesh.castShadow = true;
  pelvisGroup.add(pelvisMesh);
  mannequinGroup.add(pelvisGroup);

  const clavicleMesh = new Mesh(unitCylinderGeo, regionMaterials.shoulders);
  clavicleMesh.castShadow = true;
  mannequinGroup.add(clavicleMesh);

  const makeLimbMesh = (mat: MeshStandardMaterial): Mesh => {
    const m = new Mesh(unitCylinderGeo, mat);
    m.castShadow = true;
    mannequinGroup.add(m);
    return m;
  };
  const makeJointMesh = (mat: MeshStandardMaterial, radius: number): Mesh => {
    const m = new Mesh(unitJointGeo, mat);
    m.scale.setScalar(radius);
    m.castShadow = true;
    mannequinGroup.add(m);
    return m;
  };

  const limbs = {
    leftUpperArm: makeLimbMesh(regionMaterials.upperArms),
    leftForearm: makeLimbMesh(regionMaterials.forearms),
    rightUpperArm: makeLimbMesh(regionMaterials.upperArms),
    rightForearm: makeLimbMesh(regionMaterials.forearms),
    leftThigh: makeLimbMesh(regionMaterials.thighs),
    leftShin: makeLimbMesh(regionMaterials.calves),
    leftFoot: makeLimbMesh(shoeMat),
    rightThigh: makeLimbMesh(regionMaterials.thighs),
    rightShin: makeLimbMesh(regionMaterials.calves),
    rightFoot: makeLimbMesh(shoeMat),
  };

  const joints = {
    leftShoulder: makeJointMesh(regionMaterials.shoulders, 0.062),
    rightShoulder: makeJointMesh(regionMaterials.shoulders, 0.062),
    leftElbow: makeJointMesh(regionMaterials.upperArms, 0.044),
    rightElbow: makeJointMesh(regionMaterials.upperArms, 0.044),
    leftHand: makeJointMesh(handMat, 0.042),
    rightHand: makeJointMesh(handMat, 0.042),
    leftHip: makeJointMesh(regionMaterials.glutes, 0.064),
    rightHip: makeJointMesh(regionMaterials.glutes, 0.064),
    leftKnee: makeJointMesh(regionMaterials.thighs, 0.052),
    rightKnee: makeJointMesh(regionMaterials.thighs, 0.052),
    leftAnkle: makeJointMesh(shoeMat, 0.04),
    rightAnkle: makeJointMesh(shoeMat, 0.04),
  };

  // Scratch vectors & matrices (zero per-frame allocations).
  const tmpDir = new Vector3();
  const tmpMid = new Vector3();
  const tmpRight = new Vector3();
  const tmpUp = new Vector3();
  const tmpFwd = new Vector3();
  const tmpQuat = new Quaternion();
  const tmpMat = new Matrix4();
  const vPelvis = new Vector3();
  const vChest = new Vector3();
  const vHead = new Vector3();
  const vLSh = new Vector3();
  const vLEl = new Vector3();
  const vLHd = new Vector3();
  const vRSh = new Vector3();
  const vREl = new Vector3();
  const vRHd = new Vector3();
  const vLHip = new Vector3();
  const vLKn = new Vector3();
  const vLAn = new Vector3();
  const vLTo = new Vector3();
  const vRHip = new Vector3();
  const vRKn = new Vector3();
  const vRAn = new Vector3();
  const vRTo = new Vector3();

  return {
    syncHighlights,
    vectors: { vLHd, vRHd, vLAn, vRAn },
    applyPose(pose, highlights, progress) {
      pulseRegionEmissive(highlights, progress);

      toVec3(pose.pelvis, vPelvis);
      toVec3(pose.chest, vChest);
      toVec3(pose.head, vHead);
      toVec3(pose.leftArm.shoulder, vLSh);
      toVec3(pose.leftArm.elbow, vLEl);
      toVec3(pose.leftArm.hand, vLHd);
      toVec3(pose.rightArm.shoulder, vRSh);
      toVec3(pose.rightArm.elbow, vREl);
      toVec3(pose.rightArm.hand, vRHd);
      toVec3(pose.leftLeg.hip, vLHip);
      toVec3(pose.leftLeg.knee, vLKn);
      toVec3(pose.leftLeg.ankle, vLAn);
      toVec3(pose.leftLeg.toe, vLTo);
      toVec3(pose.rightLeg.hip, vRHip);
      toVec3(pose.rightLeg.knee, vRKn);
      toVec3(pose.rightLeg.ankle, vRAn);
      toVec3(pose.rightLeg.toe, vRTo);

      // Head + facing visor
      headGroup.position.copy(vHead);
      tmpFwd.set(pose.headForward.x, pose.headForward.y, pose.headForward.z).normalize();
      tmpUp.subVectors(vHead, vChest).normalize();
      if (Math.abs(tmpFwd.dot(tmpUp)) > 0.96) {
        tmpUp.set(0, 1, 0);
      }
      tmpRight.crossVectors(tmpUp, tmpFwd).normalize();
      tmpUp.crossVectors(tmpFwd, tmpRight).normalize();
      tmpMat.makeBasis(tmpRight, tmpUp, tmpFwd);
      headGroup.quaternion.setFromRotationMatrix(tmpMat);

      // Chest group oriented along torso up & shoulder-to-shoulder width.
      tmpUp.subVectors(vChest, vPelvis).normalize();
      tmpRight.subVectors(vLSh, vRSh).normalize();
      tmpFwd.crossVectors(tmpRight, tmpUp).normalize();
      tmpRight.crossVectors(tmpUp, tmpFwd).normalize();
      tmpMat.makeBasis(tmpRight, tmpUp, tmpFwd);
      chestGroup.position.lerpVectors(vPelvis, vChest, 0.72);
      chestGroup.quaternion.setFromRotationMatrix(tmpMat);

      // Midsection core band positioned between pelvis and ribcage.
      coreGroup.position.lerpVectors(vPelvis, vChest, 0.34);
      coreGroup.quaternion.setFromRotationMatrix(tmpMat);

      // Pelvis group oriented along hip-to-hip width & spine up.
      tmpRight.subVectors(vLHip, vRHip).normalize();
      tmpFwd.crossVectors(tmpRight, tmpUp).normalize();
      tmpRight.crossVectors(tmpUp, tmpFwd).normalize();
      tmpMat.makeBasis(tmpRight, tmpUp, tmpFwd);
      pelvisGroup.position.copy(vPelvis);
      pelvisGroup.quaternion.setFromRotationMatrix(tmpMat);

      alignSegment(neckMesh, vChest, vHead, 0.044, tmpDir, tmpMid, tmpQuat);
      alignSegment(clavicleMesh, vRSh, vLSh, 0.052, tmpDir, tmpMid, tmpQuat);

      alignSegment(limbs.leftUpperArm, vLSh, vLEl, 0.044, tmpDir, tmpMid, tmpQuat);
      alignSegment(limbs.leftForearm, vLEl, vLHd, 0.037, tmpDir, tmpMid, tmpQuat);
      alignSegment(limbs.rightUpperArm, vRSh, vREl, 0.044, tmpDir, tmpMid, tmpQuat);
      alignSegment(limbs.rightForearm, vREl, vRHd, 0.037, tmpDir, tmpMid, tmpQuat);

      alignSegment(limbs.leftThigh, vLHip, vLKn, 0.058, tmpDir, tmpMid, tmpQuat);
      alignSegment(limbs.leftShin, vLKn, vLAn, 0.046, tmpDir, tmpMid, tmpQuat);
      alignSegment(limbs.leftFoot, vLAn, vLTo, 0.036, tmpDir, tmpMid, tmpQuat);

      alignSegment(limbs.rightThigh, vRHip, vRKn, 0.058, tmpDir, tmpMid, tmpQuat);
      alignSegment(limbs.rightShin, vRKn, vRAn, 0.046, tmpDir, tmpMid, tmpQuat);
      alignSegment(limbs.rightFoot, vRAn, vRTo, 0.036, tmpDir, tmpMid, tmpQuat);

      joints.leftShoulder.position.copy(vLSh);
      joints.rightShoulder.position.copy(vRSh);
      joints.leftElbow.position.copy(vLEl);
      joints.rightElbow.position.copy(vREl);
      joints.leftHand.position.copy(vLHd);
      joints.rightHand.position.copy(vRHd);
      joints.leftHip.position.copy(vLHip);
      joints.rightHip.position.copy(vRHip);
      joints.leftKnee.position.copy(vLKn);
      joints.rightKnee.position.copy(vRKn);
      joints.leftAnkle.position.copy(vLAn);
      joints.rightAnkle.position.copy(vRAn);
    },
  };
}
