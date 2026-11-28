/**
 * Procedural Three.js 3D exercise stage controller (Phase 4 / ADR-0002).
 *
 * Runs strictly outside Preact's render cycle via direct Three.js object mutation
 * inside `requestAnimationFrame` for 60 FPS zero-re-render performance.
 */

import {
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  CapsuleGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Scene,
  ShadowMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { AnimationId } from '../../domain/schema';
import {
  CAMERA_PRESETS,
  computeAnimation3DFrame,
  RIG_DIMENSIONS,
  type CameraPresetId,
  type RigPose3D,
  type Vec3,
} from '../../engine/kinematics3d';
import {
  BODY_REGIONS,
  getRegionColorSpec,
  resolveMuscleHighlights,
  type BodyRegion,
  type MuscleHighlightMap,
} from '../../engine/muscleHighlights';

export interface Stage3DControllerOptions {
  container: HTMLElement;
  initialAnimation: AnimationId;
  initialMuscleGroup?: string;
  initialSpeed: number;
  initialWeightLabel: string | null;
  paused?: boolean;
  onCueChange?: (cue: string) => void;
  onOrbitChange?: (orbited: boolean) => void;
  onContextLost?: () => void;
}

export interface Stage3DController {
  setAnimation: (animationType: AnimationId, muscleGroup?: string) => void;
  setMuscleGroup: (muscleGroup?: string) => void;
  setSpeed: (speedMultiplier: number) => void;
  setWeightLabel: (weightLabel: string | null) => void;
  setPaused: (paused: boolean) => void;
  resetOrbit: () => void;
  dispose: () => void;
}

const UP_AXIS = new Vector3(0, 1, 0);

function toVec3(v: Vec3, out: Vector3): Vector3 {
  return out.set(v.x, v.y, v.z);
}

/**
 * Align a unit-height (length = 1 along Y) limb mesh so its endpoints span `a -> b`.
 */
function alignSegment(
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

/**
 * Build a crisp circular weight-plate CanvasTexture (e.g., "5kg", "10kg").
 */
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

export function createStage3DController(options: Stage3DControllerOptions): Stage3DController {
  const { container } = options;

  let animationType: AnimationId = options.initialAnimation;
  let muscleGroup = options.initialMuscleGroup;
  let highlights: MuscleHighlightMap = resolveMuscleHighlights(animationType, muscleGroup);
  let speedMultiplier = options.initialSpeed;
  let weightLabel = options.initialWeightLabel;
  let paused = options.paused ?? false;
  let phaseTime = 0;
  let lastCue = '';

  const width = Math.max(160, container.clientWidth || 320);
  const height = Math.max(160, container.clientHeight || 280);

  const renderer = new WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'default',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.outputColorSpace = SRGBColorSpace;

  const canvas = renderer.domElement;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.touchAction = 'pan-y';
  canvas.style.cursor = 'grab';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('data-testid', 'stage-3d-canvas');
  canvas.setAttribute('aria-label', 'Interactive 3D exercise form demonstrator');
  container.appendChild(canvas);

  const scene = new Scene();

  const camera = new PerspectiveCamera(38, width / height, 0.1, 25);

  // Studio 3-point lighting matching Home Fitness Studio slate + emerald palette.
  const hemiLight = new HemisphereLight(0xe2e8f0, 0x0f172a, 1.05);
  scene.add(hemiLight);

  const ambientLight = new AmbientLight(0x94a3b8, 0.35);
  scene.add(ambientLight);

  const keyLight = new DirectionalLight(0xf8fafc, 1.85);
  keyLight.position.set(2.4, 4.4, 3.2);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 12;
  const shadowExtent = 2.1;
  keyLight.shadow.camera.left = -shadowExtent;
  keyLight.shadow.camera.right = shadowExtent;
  keyLight.shadow.camera.top = shadowExtent;
  keyLight.shadow.camera.bottom = -shadowExtent;
  keyLight.shadow.bias = -0.0005;
  scene.add(keyLight);

  const rimLight = new DirectionalLight(0x34d399, 0.95);
  rimLight.position.set(-2.6, 2.5, -2.6);
  scene.add(rimLight);

  // Track disposable geometries, materials, and textures for guaranteed cleanup.
  const disposableGeometries: Array<{ dispose: () => void }> = [];
  const disposableMaterials: Array<{ dispose: () => void }> = [];
  const trackGeo = <T extends { dispose: () => void }>(g: T): T => {
    disposableGeometries.push(g);
    return g;
  };
  const trackMat = <T extends { dispose: () => void }>(m: T): T => {
    disposableMaterials.push(m);
    return m;
  };

  // ── Floor & Fitness Mat ────────────────────────────────────────────────────
  const floorShadowGeo = trackGeo(new PlaneGeometry(6, 6));
  const floorShadowMat = trackMat(new ShadowMaterial({ opacity: 0.42 }));
  const floorShadow = new Mesh(floorShadowGeo, floorShadowMat);
  floorShadow.rotation.x = -Math.PI / 2;
  floorShadow.position.y = -0.001;
  floorShadow.receiveShadow = true;
  scene.add(floorShadow);

  const floorRingGeo = trackGeo(new CircleGeometry(1.28, 48));
  const floorRingMat = trackMat(
    new MeshStandardMaterial({
      color: new Color(0x0f172a),
      roughness: 0.95,
      metalness: 0.05,
      transparent: true,
      opacity: 0.3,
    }),
  );
  const floorRing = new Mesh(floorRingGeo, floorRingMat);
  floorRing.rotation.x = -Math.PI / 2;
  floorRing.position.y = -0.016;
  floorRing.receiveShadow = true;
  scene.add(floorRing);

  const matGeo = trackGeo(new BoxGeometry(2.05, 0.014, 0.88));
  const matMaterial = trackMat(
    new MeshStandardMaterial({
      color: new Color(0x1e293b),
      roughness: 0.88,
      metalness: 0.08,
    }),
  );
  const gymMat = new Mesh(matGeo, matMaterial);
  gymMat.position.y = -0.007;
  gymMat.receiveShadow = true;
  scene.add(gymMat);

  const matTrimGeo = trackGeo(new BoxGeometry(2.07, 0.004, 0.9));
  const matTrimMat = trackMat(
    new MeshStandardMaterial({
      color: new Color(0x10b981),
      emissive: new Color(0x064e3b),
      emissiveIntensity: 0.45,
      roughness: 0.6,
    }),
  );
  const matTrim = new Mesh(matTrimGeo, matTrimMat);
  matTrim.position.y = -0.013;
  scene.add(matTrim);

  // ── Stylized Articulated 3D Mannequin (single rig, dynamic muscle materials) ─
  const mannequinGroup = new Group();
  scene.add(mannequinGroup);

  const unitCylinderGeo = trackGeo(new CylinderGeometry(1, 1, 1, 16, 1));
  const unitJointGeo = trackGeo(new SphereGeometry(1, 18, 14));

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

  const syncRegionBaseColors = (): void => {
    for (const region of BODY_REGIONS) {
      const level = highlights[region];
      const spec = getRegionColorSpec(region, level);
      const mat = regionMaterials[region];
      mat.color.setHex(spec.colorInt);
      mat.emissive.setHex(spec.emissiveInt);
      mat.emissiveIntensity = spec.baseEmissive;
    }
  };

  const pulseRegionEmissive = (progress: number): void => {
    for (const region of BODY_REGIONS) {
      const level = highlights[region];
      if (level === 'neutral') continue;
      const spec = getRegionColorSpec(region, level);
      regionMaterials[region].emissiveIntensity =
        spec.baseEmissive + (spec.peakEmissive - spec.baseEmissive) * progress;
    }
  };

  syncRegionBaseColors();

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

  // Limbs & joints bound directly to their anatomical region materials.
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

  // ── Dynamic 3D Props ───────────────────────────────────────────────────────
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

  let currentWeightTexture = createWeightPlateTexture(weightLabel ?? '5kg');
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

  // ── Camera & Pointer Orbit State ───────────────────────────────────────────
  let activePreset: CameraPresetId = 'front';
  const currentCamTarget = new Vector3(0, 0.96, 0);
  const desiredCamTarget = new Vector3(0, 0.96, 0);
  const currentBaseOffset = new Vector3(0.22, 0.28, 2.85);
  const desiredBaseOffset = new Vector3(0.22, 0.28, 2.85);

  let orbitYaw = 0;
  let orbitPitch = 0;
  let isOrbited = false;
  let dragging = false;
  let activePointerId: number | null = null;
  let lastPointerX = 0;
  let lastPointerY = 0;

  const setOrbitFlag = (next: boolean): void => {
    if (next !== isOrbited) {
      isOrbited = next;
      options.onOrbitChange?.(next);
    }
  };

  const syncCameraPreset = (presetId: CameraPresetId, snap: boolean): void => {
    activePreset = presetId;
    const cfg = CAMERA_PRESETS[presetId];
    desiredCamTarget.set(cfg.target.x, cfg.target.y, cfg.target.z);
    desiredBaseOffset.set(
      cfg.position.x - cfg.target.x,
      cfg.position.y - cfg.target.y,
      cfg.position.z - cfg.target.z,
    );
    if (snap) {
      currentCamTarget.copy(desiredCamTarget);
      currentBaseOffset.copy(desiredBaseOffset);
    }
  };

  const handlePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    dragging = true;
    activePointerId = event.pointerId;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    canvas.style.cursor = 'grabbing';
    canvas.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent): void => {
    if (!dragging || event.pointerId !== activePointerId) return;
    const dx = event.clientX - lastPointerX;
    const dy = event.clientY - lastPointerY;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    orbitYaw -= dx * 0.0085;
    orbitPitch = Math.max(-0.55, Math.min(0.8, orbitPitch + dy * 0.0065));
    if (Math.abs(orbitYaw) > 0.04 || Math.abs(orbitPitch) > 0.04) {
      setOrbitFlag(true);
    }
  };

  const endDrag = (event: PointerEvent): void => {
    if (!dragging || event.pointerId !== activePointerId) return;
    dragging = false;
    activePointerId = null;
    canvas.style.cursor = 'grab';
    if (canvas.hasPointerCapture?.(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  const handleContextLost = (event: Event): void => {
    event.preventDefault();
    options.onContextLost?.();
  };
  canvas.addEventListener('webglcontextlost', handleContextLost);

  // Reusable scratch vectors & matrices (zero per-frame allocations).
  const tmpA = new Vector3();
  const tmpB = new Vector3();
  const tmpC = new Vector3();
  const tmpD = new Vector3();
  const tmpDir = new Vector3();
  const tmpMid = new Vector3();
  const tmpRight = new Vector3();
  const tmpUp = new Vector3();
  const tmpFwd = new Vector3();
  const tmpQuat = new Quaternion();
  const tmpMat = new Matrix4();
  const tmpCamPos = new Vector3();
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
  const wallBaseNormal = new Vector3(0, 0, 1);

  const updateCamera = (dt: number): void => {
    const damp = 1 - Math.exp(-Math.min(0.1, dt) * 6.5);
    currentCamTarget.lerp(desiredCamTarget, damp);
    currentBaseOffset.lerp(desiredBaseOffset, damp);

    const radius = currentBaseOffset.length();
    const baseAzimuth = Math.atan2(currentBaseOffset.x, currentBaseOffset.z);
    const basePolar = Math.acos(Math.max(-0.98, Math.min(0.98, currentBaseOffset.y / radius)));

    const azimuth = baseAzimuth + orbitYaw;
    const polar = Math.max(0.32, Math.min(Math.PI / 2 - 0.05, basePolar + orbitPitch));

    tmpCamPos.set(
      currentCamTarget.x + radius * Math.sin(polar) * Math.sin(azimuth),
      Math.max(0.24, currentCamTarget.y + radius * Math.cos(polar)),
      currentCamTarget.z + radius * Math.sin(polar) * Math.cos(azimuth),
    );
    camera.position.copy(tmpCamPos);
    camera.lookAt(currentCamTarget);
  };

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

  const applyPose = (pose: RigPose3D, cue: string, progress: number): void => {
    if (cue !== lastCue) {
      lastCue = cue;
      options.onCueChange?.(cue);
    }

    pulseRegionEmissive(progress);

    if (pose.cameraPreset !== activePreset) {
      syncCameraPreset(pose.cameraPreset, false);
    }

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

    // Chest group oriented along torso up & shoulder-to-shoulder width (shows torso twist!).
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

    // Limbs
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

    // Joint spheres
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

    // ── Props ────────────────────────────────────────────────────────────────
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

    // Elastic band
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

    // Foam roller
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

    // Architectural wall backdrop
    if (pose.prop.kind === 'wall') {
      wallGroup.visible = true;
      wallGroup.position.set(pose.prop.center.x, pose.prop.center.y, pose.prop.center.z);
      tmpDir.set(pose.prop.normal.x, pose.prop.normal.y, pose.prop.normal.z).normalize();
      tmpQuat.setFromUnitVectors(wallBaseNormal, tmpDir);
      wallGroup.quaternion.copy(tmpQuat);
    } else {
      wallGroup.visible = false;
    }
  };

  // Paint initial frame immediately so first paint has exact pose & camera framing.
  const initialFrame = computeAnimation3DFrame(animationType, 0);
  syncCameraPreset(initialFrame.pose.cameraPreset, true);
  applyPose(initialFrame.pose, initialFrame.cue, initialFrame.progress);
  updateCamera(1);
  renderer.render(scene, camera);

  // Responsive ResizeObserver
  const handleResize = (): void => {
    const nextW = Math.max(120, container.clientWidth);
    const nextH = Math.max(120, container.clientHeight);
    camera.aspect = nextW / nextH;
    camera.updateProjectionMatrix();
    renderer.setSize(nextW, nextH, false);
  };

  let resizeObserver: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
  }

  let rafId: number | null = null;
  let lastTimestamp = 0;
  let disposed = false;

  const tick = (timestamp: number): void => {
    if (disposed) return;
    if (document.hidden || paused) {
      lastTimestamp = 0;
      rafId = requestAnimationFrame(tick);
      return;
    }

    if (!lastTimestamp) {
      lastTimestamp = timestamp;
    }
    const dt = Math.min(0.1, Math.max(0, (timestamp - lastTimestamp) / 1000));
    lastTimestamp = timestamp;

    const cycleDuration = 3.2 / Math.max(0.5, speedMultiplier);
    phaseTime = (phaseTime + dt) % cycleDuration;
    const rawT = phaseTime / cycleDuration;

    const frame = computeAnimation3DFrame(animationType, rawT);
    applyPose(frame.pose, frame.cue, frame.progress);
    updateCamera(dt);
    renderer.render(scene, camera);

    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);

  return {
    setAnimation(nextAnim, nextMuscleGroup) {
      const animChanged = nextAnim !== animationType;
      const muscleChanged = nextMuscleGroup !== undefined && nextMuscleGroup !== muscleGroup;
      if (!animChanged && !muscleChanged) return;
      animationType = nextAnim;
      if (nextMuscleGroup !== undefined) {
        muscleGroup = nextMuscleGroup;
      }
      highlights = resolveMuscleHighlights(animationType, muscleGroup);
      syncRegionBaseColors();
      if (animChanged) {
        phaseTime = 0;
        // Reset manual orbit when switching exercises so the new optimal camera angle shines.
        orbitYaw = 0;
        orbitPitch = 0;
        setOrbitFlag(false);
      }
      const cycleDuration = 3.2 / Math.max(0.5, speedMultiplier);
      const frame = computeAnimation3DFrame(animationType, phaseTime / cycleDuration);
      applyPose(frame.pose, frame.cue, frame.progress);
      renderer.render(scene, camera);
    },
    setMuscleGroup(nextMuscleGroup) {
      if (nextMuscleGroup === muscleGroup) return;
      muscleGroup = nextMuscleGroup;
      highlights = resolveMuscleHighlights(animationType, muscleGroup);
      syncRegionBaseColors();
      const cycleDuration = 3.2 / Math.max(0.5, speedMultiplier);
      const frame = computeAnimation3DFrame(animationType, phaseTime / cycleDuration);
      applyPose(frame.pose, frame.cue, frame.progress);
      renderer.render(scene, camera);
    },
    setSpeed(nextSpeed) {
      speedMultiplier = nextSpeed;
    },
    setWeightLabel(nextLabel) {
      if (nextLabel === weightLabel) return;
      weightLabel = nextLabel;
      if (nextLabel) {
        const nextTex = createWeightPlateTexture(nextLabel);
        for (const rig of [leftDumbbell, rightDumbbell, singleDumbbell]) {
          for (const mat of rig.endCapMaterials) {
            mat.map = nextTex;
            mat.needsUpdate = true;
          }
        }
        currentWeightTexture.dispose();
        currentWeightTexture = nextTex;
      }
      const cycleDuration = 3.2 / Math.max(0.5, speedMultiplier);
      const frame = computeAnimation3DFrame(animationType, phaseTime / cycleDuration);
      applyPose(frame.pose, frame.cue, frame.progress);
      renderer.render(scene, camera);
    },
    setPaused(nextPaused) {
      paused = nextPaused;
      if (!paused) {
        lastTimestamp = 0;
      }
    },
    resetOrbit() {
      orbitYaw = 0;
      orbitPitch = 0;
      setOrbitFlag(false);
    },
    dispose() {
      disposed = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', endDrag);
      canvas.removeEventListener('pointercancel', endDrag);
      canvas.removeEventListener('webglcontextlost', handleContextLost);

      currentWeightTexture.dispose();
      for (const rig of [leftDumbbell, rightDumbbell, singleDumbbell]) {
        for (const mat of rig.endCapMaterials) {
          mat.dispose();
        }
      }
      for (const geo of disposableGeometries) geo.dispose();
      for (const mat of disposableMaterials) mat.dispose();
      renderer.dispose();
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
    },
  };
}
