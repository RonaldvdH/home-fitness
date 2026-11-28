/**
 * Smooth camera preset interpolation & pointer drag-to-orbit controller for Stage3D.
 */

import { type PerspectiveCamera, Vector3 } from 'three';
import { CAMERA_PRESETS, type CameraPresetId } from '../../engine/kinematics3d';

export interface OrbitController {
  getActivePreset: () => CameraPresetId;
  syncPreset: (presetId: CameraPresetId, snap: boolean) => void;
  updateCamera: (dt: number) => void;
  resetOrbit: () => void;
  dispose: () => void;
}

export function createOrbitController(
  canvas: HTMLCanvasElement,
  camera: PerspectiveCamera,
  onOrbitChange?: (orbited: boolean) => void,
): OrbitController {
  let activePreset: CameraPresetId = 'front';
  const currentCamTarget = new Vector3(0, 0.96, 0);
  const desiredCamTarget = new Vector3(0, 0.96, 0);
  const currentBaseOffset = new Vector3(0.22, 0.28, 2.85);
  const desiredBaseOffset = new Vector3(0.22, 0.28, 2.85);
  const tmpCamPos = new Vector3();

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
      onOrbitChange?.(next);
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
    orbitPitch = Math.max(-0.55, Math.min(0.8, orbitPitch - dy * 0.0065));
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

  return {
    getActivePreset() {
      return activePreset;
    },

    syncPreset(presetId, snap) {
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
    },

    updateCamera(dt) {
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
    },

    resetOrbit() {
      orbitYaw = 0;
      orbitPitch = 0;
      setOrbitFlag(false);
    },

    dispose() {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', endDrag);
      canvas.removeEventListener('pointercancel', endDrag);
    },
  };
}
