/**
 * Dynamic 3D exercise props (dumbbells, resistance band, foam roller, wall backdrop)
 * and 3D dashed motion-guide trajectories for Stage3D.
 */

import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  Line,
  LineDashedMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  type Scene,
} from 'three';
import type { AnimationId } from '../../domain/schema';
import {
  computeMotionGuidePaths3D,
  RIG_DIMENSIONS,
  type RigPose3D,
} from '../../engine/kinematics3d';
import type { MannequinVectors } from './mannequinRig';
import { alignSegment, UP_AXIS, type ResourceTracker } from './stageHelpers';

function createWeightPlateTexture(label: string): CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.43, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '900 40px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.slice(0, 6), size / 2, size / 2 + 2);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

interface DumbbellRig {
  group: Group;
  endCapMaterials: MeshStandardMaterial[];
}

function createDumbbellRig(
  barGeo: CylinderGeometry,
  plateGeo: CylinderGeometry,
  capGeo: CircleGeometry,
  barMat: MeshStandardMaterial,
  plateMat: MeshStandardMaterial,
  capTexture: CanvasTexture,
): DumbbellRig {
  const group = new Group();
  const bar = new Mesh(barGeo, barMat);
  bar.castShadow = true;
  group.add(bar);

  const plateOffsets = [-0.095, 0.095];
  const endCapMaterials: MeshStandardMaterial[] = [];

  for (const offset of plateOffsets) {
    const plate = new Mesh(plateGeo, plateMat);
    plate.position.y = offset;
    plate.castShadow = true;
    group.add(plate);

    const capMat = new MeshStandardMaterial({
      map: capTexture,
      roughness: 0.45,
      metalness: 0.15,
    });
    endCapMaterials.push(capMat);
    const cap = new Mesh(capGeo, capMat);
    cap.position.y = offset + (offset > 0 ? 0.023 : -0.023);
    cap.rotation.x = offset > 0 ? -Math.PI / 2 : Math.PI / 2;
    group.add(cap);
  }

  return { group, endCapMaterials };
}

export interface PropsRig {
  applyProps: (pose: RigPose3D, weightLabel: string | null, vectors: MannequinVectors) => void;
  setWeightLabel: (nextLabel: string) => void;
  rebuildMotionGuides: (nextAnim: AnimationId) => void;
  dispose: () => void;
}

export function createPropsRig(
  scene: Scene,
  tracker: ResourceTracker,
  unitCylinderGeo: CylinderGeometry,
  matTrimMat: MeshStandardMaterial,
  initialWeightLabel: string | null,
  initialAnimation: AnimationId,
): PropsRig {
  const { trackGeo, trackMat } = tracker;

  // 1. Dumbbells (left, right, and single shared)
  const dbBarGeo = trackGeo(new CylinderGeometry(0.017, 0.017, 0.22, 12));
  const dbPlateGeo = trackGeo(new CylinderGeometry(0.064, 0.064, 0.044, 6));
  const dbCapGeo = trackGeo(new CircleGeometry(0.052, 18));
  const dbBarMat = trackMat(
    new MeshStandardMaterial({ color: new Color(0x94a3b8), roughness: 0.3, metalness: 0.7 }),
  );
  const dbPlateMat = trackMat(
    new MeshStandardMaterial({ color: new Color(0x1e293b), roughness: 0.45, metalness: 0.45 }),
  );

  let currentWeightTexture = createWeightPlateTexture(initialWeightLabel ?? '5kg');
  const leftDumbbell = createDumbbellRig(
    dbBarGeo,
    dbPlateGeo,
    dbCapGeo,
    dbBarMat,
    dbPlateMat,
    currentWeightTexture,
  );
  const rightDumbbell = createDumbbellRig(
    dbBarGeo,
    dbPlateGeo,
    dbCapGeo,
    dbBarMat,
    dbPlateMat,
    currentWeightTexture,
  );
  const singleDumbbell = createDumbbellRig(
    dbBarGeo,
    dbPlateGeo,
    dbCapGeo,
    dbBarMat,
    dbPlateMat,
    currentWeightTexture,
  );
  scene.add(leftDumbbell.group, rightDumbbell.group, singleDumbbell.group);

  // 2. Elastic resistance band (zero-allocation reusable segment pool)
  const bandMat = trackMat(
    new MeshStandardMaterial({
      color: new Color(0x38bdf8),
      emissive: new Color(0x0284c7),
      emissiveIntensity: 0.35,
      roughness: 0.45,
      metalness: 0.05,
    }),
  );
  const bandSegments: Mesh[] = [];
  for (let i = 0; i < 12; i += 1) {
    const seg = new Mesh(unitCylinderGeo, bandMat);
    seg.visible = false;
    scene.add(seg);
    bandSegments.push(seg);
  }

  // 3. Foam roller with subtle longitudinal traction ribs
  const rollerGroup = new Group();
  const rollerBodyGeo = trackGeo(
    new CylinderGeometry(RIG_DIMENSIONS.rollerRadius, RIG_DIMENSIONS.rollerRadius, 0.48, 24),
  );
  const rollerBodyMat = trackMat(
    new MeshStandardMaterial({
      color: new Color(0x0ea5e9),
      roughness: 0.65,
      metalness: 0.08,
    }),
  );
  const rollerBody = new Mesh(rollerBodyGeo, rollerBodyMat);
  rollerBody.castShadow = true;
  rollerBody.receiveShadow = true;
  rollerGroup.add(rollerBody);

  const rollerCoreGeo = trackGeo(new CylinderGeometry(0.044, 0.044, 0.49, 16));
  const rollerCoreMat = trackMat(
    new MeshStandardMaterial({ color: new Color(0x0f172a), roughness: 0.7 }),
  );
  rollerGroup.add(new Mesh(rollerCoreGeo, rollerCoreMat));

  const rollerRibGeo = trackGeo(new BoxGeometry(0.012, 0.46, 0.012));
  const rollerRibMat = trackMat(
    new MeshStandardMaterial({ color: new Color(0x38bdf8), roughness: 0.5 }),
  );
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    const rib = new Mesh(rollerRibGeo, rollerRibMat);
    rib.position.set(
      Math.cos(angle) * (RIG_DIMENSIONS.rollerRadius - 0.002),
      0,
      Math.sin(angle) * (RIG_DIMENSIONS.rollerRadius - 0.002),
    );
    rib.rotation.y = -angle;
    rollerGroup.add(rib);
  }
  rollerGroup.visible = false;
  scene.add(rollerGroup);

  // 4. Architectural frosted-slate wall plane for wall exercises
  const wallGroup = new Group();
  const wallPanelGeo = trackGeo(new BoxGeometry(1.9, 2.05, 0.05));
  const wallPanelMat = trackMat(
    new MeshStandardMaterial({
      color: new Color(0x1e293b),
      roughness: 0.85,
      metalness: 0.08,
      transparent: true,
      opacity: 0.88,
    }),
  );
  const wallPanel = new Mesh(wallPanelGeo, wallPanelMat);
  wallPanel.receiveShadow = true;
  wallGroup.add(wallPanel);

  const wallBorderGeo = trackGeo(new BoxGeometry(1.92, 0.025, 0.06));
  const wallBorder = new Mesh(wallBorderGeo, matTrimMat);
  wallBorder.position.y = -1.01;
  wallGroup.add(wallBorder);
  wallGroup.visible = false;
  scene.add(wallGroup);

  // 5. Subtle 3D dashed motion-guide trajectories + peak target dots
  const motionGuideGroup = new Group();
  scene.add(motionGuideGroup);

  const guideLineMat = trackMat(
    new LineDashedMaterial({
      color: new Color(0x10b981),
      dashSize: 0.045,
      gapSize: 0.032,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    }),
  );
  const guideDotGeo = trackGeo(new SphereGeometry(0.015, 12, 10));
  const guideDotMat = trackMat(
    new MeshBasicMaterial({
      color: new Color(0x34d399),
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    }),
  );
  let activeGuideGeometries: BufferGeometry[] = [];

  const rebuildMotionGuides = (nextAnim: AnimationId): void => {
    for (const geo of activeGuideGeometries) {
      geo.dispose();
    }
    activeGuideGeometries = [];
    motionGuideGroup.clear();

    const paths = computeMotionGuidePaths3D(nextAnim);
    for (const pts of paths) {
      const positions = new Float32Array(pts.length * 3);
      for (let i = 0; i < pts.length; i += 1) {
        const pt = pts[i]!;
        positions[i * 3] = pt.x;
        positions[i * 3 + 1] = pt.y;
        positions[i * 3 + 2] = pt.z;
      }
      const lineGeo = new BufferGeometry();
      lineGeo.setAttribute('position', new Float32BufferAttribute(positions, 3));
      activeGuideGeometries.push(lineGeo);

      const line = new Line(lineGeo, guideLineMat);
      line.computeLineDistances();
      motionGuideGroup.add(line);

      const peakPt = pts[pts.length - 1]!;
      const peakDot = new Mesh(guideDotGeo, guideDotMat);
      peakDot.position.set(peakPt.x, peakPt.y, peakPt.z);
      motionGuideGroup.add(peakDot);
    }
  };

  rebuildMotionGuides(initialAnimation);

  // Scratch vectors (zero per-frame allocations)
  const tmpA = new Vector3();
  const tmpB = new Vector3();
  const tmpC = new Vector3();
  const tmpD = new Vector3();
  const tmpDir = new Vector3();
  const tmpMid = new Vector3();
  const tmpQuat = new Quaternion();
  const wallBaseNormal = new Vector3(0, 0, 1);

  const applyBandCurve = (
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
      alignSegment(bandSegments[startIdx + i]!, tmpA, tmpB, 0.011, tmpDir, tmpMid, tmpQuat);
    }
  };

  return {
    applyProps(pose, weightLabel, { vLHd, vRHd, vLAn, vRAn }) {
      const showDumbbells = weightLabel !== null;
      const isSingleDb = showDumbbells && pose.prop.kind === 'dumbbells' && pose.prop.count === 1;
      const isDualDb = showDumbbells && !isSingleDb;

      leftDumbbell.group.visible = isDualDb;
      rightDumbbell.group.visible = isDualDb;
      singleDumbbell.group.visible = isSingleDb;

      if (isDualDb) {
        leftDumbbell.group.position.copy(vLHd);
        tmpDir.set(
          pose.leftArm.dumbbellAxis.x,
          pose.leftArm.dumbbellAxis.y,
          pose.leftArm.dumbbellAxis.z,
        );
        leftDumbbell.group.quaternion.setFromUnitVectors(UP_AXIS, tmpDir.normalize());

        rightDumbbell.group.position.copy(vRHd);
        tmpDir.set(
          pose.rightArm.dumbbellAxis.x,
          pose.rightArm.dumbbellAxis.y,
          pose.rightArm.dumbbellAxis.z,
        );
        rightDumbbell.group.quaternion.setFromUnitVectors(UP_AXIS, tmpDir.normalize());
      } else if (isSingleDb) {
        singleDumbbell.group.position.addVectors(vLHd, vRHd).multiplyScalar(0.5);
        tmpDir.subVectors(vLHd, vRHd);
        if (tmpDir.lengthSq() < 1e-4) {
          tmpDir.set(1, 0, 0);
        } else {
          tmpDir.normalize();
        }
        singleDumbbell.group.quaternion.setFromUnitVectors(UP_AXIS, tmpDir);
      }

      for (const seg of bandSegments) {
        seg.visible = false;
      }
      if (pose.prop.kind === 'band') {
        if (pose.prop.mode === 'hands') {
          const span = vLHd.distanceTo(vRHd);
          const sag = Math.max(0, 0.14 - span * 0.11);
          tmpC.addVectors(vLHd, vRHd).multiplyScalar(0.5);
          tmpC.y -= sag;
          applyBandCurve(0, 12, vLHd, tmpC, vRHd);
        } else if (pose.prop.mode === 'feet-to-hands') {
          tmpC.addVectors(vLAn, vLHd).multiplyScalar(0.5);
          tmpC.x += 0.04;
          applyBandCurve(0, 5, vLAn, tmpC, vLHd);

          tmpD.addVectors(vRAn, vRHd).multiplyScalar(0.5);
          tmpD.x += 0.04;
          applyBandCurve(5, 5, vRAn, tmpD, vRHd);

          alignSegment(bandSegments[10]!, vLAn, vRAn, 0.011, tmpDir, tmpMid, tmpQuat);
        } else {
          tmpC.addVectors(vLAn, vRAn).multiplyScalar(0.5);
          tmpC.y += 0.04;
          applyBandCurve(0, 10, vLAn, tmpC, vRAn);
        }
      }

      if (pose.prop.kind === 'foam-roller') {
        rollerGroup.visible = true;
        rollerGroup.position.set(pose.prop.position.x, pose.prop.position.y, pose.prop.position.z);
        if (pose.prop.axis === 'z') {
          rollerGroup.rotation.set(Math.PI / 2, pose.prop.rollAngle, 0);
        } else {
          rollerGroup.rotation.set(0, pose.prop.rollAngle, Math.PI / 2);
        }
      } else {
        rollerGroup.visible = false;
      }

      if (pose.prop.kind === 'wall') {
        wallGroup.visible = true;
        wallGroup.position.set(pose.prop.center.x, pose.prop.center.y, pose.prop.center.z);
        tmpDir.set(pose.prop.normal.x, pose.prop.normal.y, pose.prop.normal.z).normalize();
        tmpQuat.setFromUnitVectors(wallBaseNormal, tmpDir);
        wallGroup.quaternion.copy(tmpQuat);
      } else {
        wallGroup.visible = false;
      }
    },

    setWeightLabel(nextLabel) {
      const nextTex = createWeightPlateTexture(nextLabel);
      for (const rig of [leftDumbbell, rightDumbbell, singleDumbbell]) {
        for (const mat of rig.endCapMaterials) {
          mat.map = nextTex;
          mat.needsUpdate = true;
        }
      }
      currentWeightTexture.dispose();
      currentWeightTexture = nextTex;
    },

    rebuildMotionGuides,

    dispose() {
      currentWeightTexture.dispose();
      for (const rig of [leftDumbbell, rightDumbbell, singleDumbbell]) {
        for (const mat of rig.endCapMaterials) {
          mat.dispose();
        }
      }
      for (const geo of activeGuideGeometries) geo.dispose();
      activeGuideGeometries = [];
    },
  };
}
