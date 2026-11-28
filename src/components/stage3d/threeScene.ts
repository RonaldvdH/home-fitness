/**
 * Procedural Three.js 3D exercise stage controller (Phase 4 / ADR-0002).
 *
 * Runs strictly outside Preact's render cycle via direct Three.js object mutation
 * inside `requestAnimationFrame` for 60 FPS zero-re-render performance.
 */

import {
  AmbientLight,
  BoxGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShadowMaterial,
  SphereGeometry,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import type { AnimationId } from '../../domain/schema';
import { computeAnimation3DFrame, type RigPose3D } from '../../engine/kinematics3d';
import { resolveMuscleHighlights, type MuscleHighlightMap } from '../../engine/muscleHighlights';
import { createMannequinRig } from './mannequinRig';
import { createOrbitController } from './orbitController';
import { createPropsRig } from './propsRig';
import { createResourceTracker } from './stageHelpers';

export interface Stage3DControllerOptions {
  container: HTMLElement;
  initialAnimation: AnimationId;
  initialMuscleGroup?: string;
  initialSpeed: number;
  initialWeightLabel: string | null;
  paused?: boolean;
  onCueChange?: (cue: string) => void;
  onCueIndexChange?: (cueIndex: 0 | 1 | 2 | 3) => void;
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
  let lastCueIndex = -1;

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
  scene.add(new HemisphereLight(0xe2e8f0, 0x0f172a, 1.05));
  scene.add(new AmbientLight(0x94a3b8, 0.35));

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

  const tracker = createResourceTracker();
  const { trackGeo, trackMat } = tracker;

  // Floor & fitness mat
  const floorShadow = new Mesh(
    trackGeo(new PlaneGeometry(6, 6)),
    trackMat(new ShadowMaterial({ opacity: 0.42 })),
  );
  floorShadow.rotation.x = -Math.PI / 2;
  floorShadow.position.y = -0.001;
  floorShadow.receiveShadow = true;
  scene.add(floorShadow);

  const floorRing = new Mesh(
    trackGeo(new CircleGeometry(1.28, 48)),
    trackMat(
      new MeshStandardMaterial({
        color: new Color(0x0f172a),
        roughness: 0.95,
        metalness: 0.05,
        transparent: true,
        opacity: 0.3,
      }),
    ),
  );
  floorRing.rotation.x = -Math.PI / 2;
  floorRing.position.y = -0.016;
  floorRing.receiveShadow = true;
  scene.add(floorRing);

  const gymMat = new Mesh(
    trackGeo(new BoxGeometry(2.05, 0.014, 0.88)),
    trackMat(
      new MeshStandardMaterial({
        color: new Color(0x1e293b),
        roughness: 0.88,
        metalness: 0.08,
      }),
    ),
  );
  gymMat.position.y = -0.007;
  gymMat.receiveShadow = true;
  scene.add(gymMat);

  const matTrimMat = trackMat(
    new MeshStandardMaterial({
      color: new Color(0x10b981),
      emissive: new Color(0x064e3b),
      emissiveIntensity: 0.45,
      roughness: 0.6,
    }),
  );
  const matTrim = new Mesh(trackGeo(new BoxGeometry(2.07, 0.004, 0.9)), matTrimMat);
  matTrim.position.y = -0.013;
  scene.add(matTrim);

  const unitCylinderGeo = trackGeo(new CylinderGeometry(1, 1, 1, 16, 1));
  const unitJointGeo = trackGeo(new SphereGeometry(1, 18, 14));

  const mannequin = createMannequinRig(scene, tracker, unitCylinderGeo, unitJointGeo, highlights);
  const propsRig = createPropsRig(
    scene,
    tracker,
    unitCylinderGeo,
    matTrimMat,
    weightLabel,
    animationType,
  );
  const orbit = createOrbitController(canvas, camera, options.onOrbitChange);

  const handleContextLost = (event: Event): void => {
    event.preventDefault();
    options.onContextLost?.();
  };
  canvas.addEventListener('webglcontextlost', handleContextLost);

  const applyPose = (
    pose: RigPose3D,
    cue: string,
    cueIndex: 0 | 1 | 2 | 3,
    progress: number,
  ): void => {
    if (cue !== lastCue) {
      lastCue = cue;
      options.onCueChange?.(cue);
    }
    if (cueIndex !== lastCueIndex) {
      lastCueIndex = cueIndex;
      options.onCueIndexChange?.(cueIndex);
    }

    const matRotY = pose.matAxis === 'z' ? Math.PI / 2 : 0;
    if (gymMat.rotation.y !== matRotY) {
      gymMat.rotation.y = matRotY;
      matTrim.rotation.y = matRotY;
    }

    if (pose.cameraPreset !== orbit.getActivePreset()) {
      orbit.syncPreset(pose.cameraPreset, false);
    }

    mannequin.applyPose(pose, highlights, progress);
    propsRig.applyProps(pose, weightLabel, mannequin.vectors);
  };

  // Paint initial frame immediately so first paint has exact pose & camera framing.
  const initialFrame = computeAnimation3DFrame(animationType, 0);
  orbit.syncPreset(initialFrame.pose.cameraPreset, true);
  applyPose(initialFrame.pose, initialFrame.cue, initialFrame.cueIndex, initialFrame.progress);
  orbit.updateCamera(1);
  renderer.render(scene, camera);

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

  const renderCurrentFrame = (): void => {
    const cycleDuration = 3.2 / Math.max(0.5, speedMultiplier);
    const frame = computeAnimation3DFrame(animationType, phaseTime / cycleDuration);
    applyPose(frame.pose, frame.cue, frame.cueIndex, frame.progress);
    renderer.render(scene, camera);
  };

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
    applyPose(frame.pose, frame.cue, frame.cueIndex, frame.progress);
    orbit.updateCamera(dt);
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
      mannequin.syncHighlights(highlights);
      if (animChanged) {
        phaseTime = 0;
        orbit.resetOrbit();
        propsRig.rebuildMotionGuides(animationType);
      }
      renderCurrentFrame();
    },
    setMuscleGroup(nextMuscleGroup) {
      if (nextMuscleGroup === muscleGroup) return;
      muscleGroup = nextMuscleGroup;
      highlights = resolveMuscleHighlights(animationType, muscleGroup);
      mannequin.syncHighlights(highlights);
      renderCurrentFrame();
    },
    setSpeed(nextSpeed) {
      speedMultiplier = nextSpeed;
    },
    setWeightLabel(nextLabel) {
      if (nextLabel === weightLabel) return;
      weightLabel = nextLabel;
      if (nextLabel) {
        propsRig.setWeightLabel(nextLabel);
      }
      renderCurrentFrame();
    },
    setPaused(nextPaused) {
      paused = nextPaused;
      if (!paused) {
        lastTimestamp = 0;
      }
    },
    resetOrbit() {
      orbit.resetOrbit();
    },
    dispose() {
      disposed = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      orbit.dispose();
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      propsRig.dispose();
      tracker.disposeAll();
      renderer.dispose();
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
    },
  };
}
