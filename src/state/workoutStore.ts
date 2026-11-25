/**
 * Encapsulated reactive workout store.
 * Coordinates persisted AppDataV3, timeline derivation, wall-clock timer,
 * non-destructive exercise preview, audio/voice cues, Wake Lock, and toasts.
 */

import { cloneDefaultExercises } from '../domain/defaults';
import {
  MAX_HISTORY_RECORDS,
  normalizeEquipment,
  type AnimationId,
  type AppDataV3,
  type EquipmentSpec,
  type Exercise,
  type Routine,
  type SessionRecord,
  type TimelineStep,
  type WorkoutSettings,
} from '../domain/schema';
import { buildCircuitTimeline, computeTotalDuration } from '../domain/timeline';
import {
  createWorkoutTimer,
  type TimerClock,
  type TimerSnapshot,
  type WorkoutTimerController,
} from '../engine/timer';
import { createAudioCoach, type AudioCoach } from '../services/audio';
import { createVoiceCoach, type VoiceCoach } from '../services/speech';
import {
  createLocalStorageAdapter,
  parseBackupJson,
  serializeBackupJson,
  type StorageAdapter,
} from '../services/storage';
import { createWakeLockController, type WakeLockController } from '../services/wakeLock';

export type ToastVariant = 'info' | 'success' | 'error';

export interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

export interface ExerciseFormInput {
  id?: string;
  name: string;
  muscleGroup: string;
  equipment?: EquipmentSpec | string;
  animationType: AnimationId;
  steps: string[];
  tip: string;
}

export interface WorkoutStoreState {
  data: AppDataV3;
  activeRoutine: Routine;
  timeline: TimelineStep[];
  totalDurationSec: number;
  timer: TimerSnapshot;
  previewExerciseId: string | null;
  toasts: ToastItem[];
  voiceSupported: boolean;
}

export interface WorkoutStoreDependencies {
  storage?: StorageAdapter;
  audio?: AudioCoach;
  voice?: VoiceCoach;
  wakeLock?: WakeLockController;
  clock?: TimerClock;
}

type Listener = () => void;

export interface WorkoutStore {
  getState: () => WorkoutStoreState;
  subscribe: (listener: Listener) => () => void;
  start: () => void;
  pause: () => void;
  toggleStartPause: () => void;
  reset: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  previewExercise: (exerciseId: string) => void;
  clearPreview: () => void;
  saveExercise: (input: ExerciseFormInput) => void;
  moveExercise: (index: number, delta: -1 | 1) => void;
  toggleExerciseActive: (exerciseId: string) => void;
  deleteExercise: (exerciseId: string) => void;
  restoreDefaultExercises: () => void;
  updateSettings: (next: Partial<WorkoutSettings>) => void;
  toggleSound: () => void;
  toggleVoice: () => void;
  setDemoSpeed: (speed: number) => void;
  testAudioBeep: () => void;
  testVoice: () => void;
  logManualSession: () => void;
  exportJson: () => string;
  importJson: (jsonText: string) => boolean;
  pushToast: (message: string, variant?: ToastVariant) => void;
  dismissToast: (id: number) => void;
  destroy: () => void;
}

function getActiveRoutine(data: AppDataV3): Routine {
  return data.routines.find((r) => r.id === data.activeRoutineId) ?? data.routines[0]!;
}

export function createWorkoutStore(deps: WorkoutStoreDependencies = {}): WorkoutStore {
  const storage = deps.storage ?? createLocalStorageAdapter();
  let data = storage.load();
  let activeRoutine = getActiveRoutine(data);

  const audio = deps.audio ?? createAudioCoach(activeRoutine.settings.soundEnabled);
  const voice = deps.voice ?? createVoiceCoach(activeRoutine.settings.voiceEnabled);
  const wakeLock = deps.wakeLock ?? createWakeLockController();

  let timeline = buildCircuitTimeline(activeRoutine.exercises, activeRoutine.settings);
  let totalDurationSec = computeTotalDuration(timeline);
  let previewExerciseId: string | null = null;
  let toasts: ToastItem[] = [];
  let nextToastId = 1;
  const toastTimers = new Map<number, ReturnType<typeof setTimeout>>();

  const listeners = new Set<Listener>();
  let cachedState: WorkoutStoreState;

  function buildSnapshot(timerSnap: TimerSnapshot): WorkoutStoreState {
    return {
      data,
      activeRoutine,
      timeline,
      totalDurationSec,
      timer: timerSnap,
      previewExerciseId,
      toasts,
      voiceSupported: voice.isSupported(),
    };
  }

  function notify(): void {
    cachedState = buildSnapshot(timer.getSnapshot());
    listeners.forEach((listener) => listener());
  }

  function persistData(): void {
    storage.save(data);
  }

  function pushToast(message: string, variant: ToastVariant = 'info'): void {
    const id = nextToastId++;
    toasts = [...toasts, { id, message, variant }];
    notify();

    const handle = setTimeout(() => {
      dismissToast(id);
    }, 3200);
    toastTimers.set(id, handle);
  }

  function dismissToast(id: number): void {
    const handle = toastTimers.get(id);
    if (handle !== undefined) {
      clearTimeout(handle);
      toastTimers.delete(id);
    }
    if (toasts.some((t) => t.id === id)) {
      toasts = toasts.filter((t) => t.id !== id);
      notify();
    }
  }

  function recordSession(source: 'completed' | 'manual'): void {
    const entry: SessionRecord = {
      id: `sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      routineId: activeRoutine.id,
      routineName: activeRoutine.name,
      completedAt: new Date().toISOString(),
      durationSec: Math.max(60, totalDurationSec),
      rounds: activeRoutine.settings.rounds,
      exerciseCount: activeRoutine.exercises.filter((e) => e.active).length,
      source,
    };

    data = {
      ...data,
      history: [entry, ...data.history].slice(0, MAX_HISTORY_RECORDS),
    };
    persistData();
  }

  const timer: WorkoutTimerController = createWorkoutTimer(
    timeline,
    {
      onChange: (snap) => {
        if (snap.status !== 'running') {
          void wakeLock.release();
        }
        notify();
      },
      onCountdown: (sec) => {
        audio.beepCountdown();
        voice.announceCountdown(sec);
      },
      onStepStart: (step) => {
        if (step.phase === 'WORK') audio.beepWorkStart();
        else if (step.phase === 'REST') audio.beepRestStart();
        else audio.beepCountdown();
        voice.announceStep(step);
      },
      onComplete: () => {
        void wakeLock.release();
        audio.beepComplete();
        voice.announceComplete();
        recordSession('completed');
        pushToast('Circuit complete! Session saved to your workout history.', 'success');
      },
    },
    deps.clock,
  );

  cachedState = buildSnapshot(timer.getSnapshot());

  function updateActiveRoutine(
    updater: (routine: Routine) => Routine,
    options?: { resetTimeline?: boolean },
  ): void {
    const updated = {
      ...updater(activeRoutine),
      updatedAt: new Date().toISOString(),
    };

    data = {
      ...data,
      routines: data.routines.map((r) => (r.id === updated.id ? updated : r)),
    };
    activeRoutine = updated;

    audio.setEnabled(activeRoutine.settings.soundEnabled);
    voice.setEnabled(activeRoutine.settings.voiceEnabled);

    if (options?.resetTimeline !== false) {
      timeline = buildCircuitTimeline(activeRoutine.exercises, activeRoutine.settings);
      totalDurationSec = computeTotalDuration(timeline);
      previewExerciseId = null;
      voice.cancel();
      void wakeLock.release();
      timer.setTimeline(timeline, { preserveProgress: false });
    }

    persistData();
    notify();
  }

  const handleVisibilityChange = (): void => {
    const isRunning = timer.getSnapshot().status === 'running';
    if (isRunning) {
      timer.sync();
      wakeLock.handleVisibilityChange(true);
    }
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  return {
    getState() {
      return cachedState;
    },

    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    start() {
      previewExerciseId = null;
      audio.unlock();
      void wakeLock.acquire();
      timer.start();
    },

    pause() {
      voice.cancel();
      void wakeLock.release();
      timer.pause();
    },

    toggleStartPause() {
      if (timer.getSnapshot().status === 'running') {
        this.pause();
      } else {
        this.start();
      }
    },

    reset() {
      previewExerciseId = null;
      voice.cancel();
      void wakeLock.release();
      timer.reset();
    },

    stepForward() {
      previewExerciseId = null;
      voice.cancel();
      timer.stepForward();
    },

    stepBackward() {
      previewExerciseId = null;
      voice.cancel();
      timer.stepBackward();
    },

    previewExercise(exerciseId: string) {
      const exists = activeRoutine.exercises.some((ex) => ex.id === exerciseId);
      if (!exists) return;
      if (timer.getSnapshot().status === 'running') {
        voice.cancel();
        void wakeLock.release();
        timer.pause();
      }
      previewExerciseId = exerciseId;
      notify();
    },

    clearPreview() {
      if (previewExerciseId !== null) {
        previewExerciseId = null;
        notify();
      }
    },

    saveExercise(input: ExerciseFormInput) {
      const trimmedName = input.name.trim();
      const trimmedMuscles = input.muscleGroup.trim();
      if (!trimmedName || !trimmedMuscles) return;

      const cleanedSteps = input.steps.map((step) => step.trim()).filter((step) => step.length > 0);
      const steps =
        cleanedSteps.length > 0
          ? cleanedSteps
          : ['Perform the movement smoothly with controlled breathing.'];
      const tip = input.tip.trim() || 'Maintain steady breathing and smooth control.';

      const existing = input.id
        ? activeRoutine.exercises.find((item) => item.id === input.id)
        : undefined;

      const equipment = input.equipment
        ? normalizeEquipment(input.equipment)
        : existing
          ? existing.equipment
          : normalizeEquipment('2x 5kg Dumbbells');

      const nextExercise: Exercise = {
        id: existing ? existing.id : `ex-${Date.now()}`,
        name: trimmedName,
        muscleGroup: trimmedMuscles,
        equipment,
        animationType: input.animationType,
        active: existing ? existing.active : true,
        steps,
        tip,
        ...(existing?.workSecOverride !== undefined
          ? { workSecOverride: existing.workSecOverride }
          : {}),
      };

      updateActiveRoutine((routine) => ({
        ...routine,
        exercises: existing
          ? routine.exercises.map((item) => (item.id === existing.id ? nextExercise : item))
          : [...routine.exercises, nextExercise],
      }));

      pushToast(
        existing ? `Updated "${nextExercise.name}".` : `Added "${nextExercise.name}" and saved.`,
        'success',
      );
    },

    moveExercise(index: number, delta: -1 | 1) {
      const target = index + delta;
      if (target < 0 || target >= activeRoutine.exercises.length) return;
      updateActiveRoutine((routine) => {
        const next = [...routine.exercises];
        const currentItem = next[index]!;
        next[index] = next[target]!;
        next[target] = currentItem;
        return { ...routine, exercises: next };
      });
    },

    toggleExerciseActive(exerciseId: string) {
      const target = activeRoutine.exercises.find((e) => e.id === exerciseId);
      if (!target) return;
      const nextActive = !target.active;

      updateActiveRoutine((routine) => ({
        ...routine,
        exercises: routine.exercises.map((item) =>
          item.id === exerciseId ? { ...item, active: nextActive } : item,
        ),
      }));

      pushToast(nextActive ? `Enabled "${target.name}"` : `Disabled "${target.name}"`);
    },

    deleteExercise(exerciseId: string) {
      if (activeRoutine.exercises.length <= 1) {
        pushToast('Keep at least one exercise in your circuit.', 'error');
        return;
      }
      updateActiveRoutine((routine) => ({
        ...routine,
        exercises: routine.exercises.filter((item) => item.id !== exerciseId),
      }));
      pushToast('Exercise removed and saved.');
    },

    restoreDefaultExercises() {
      updateActiveRoutine((routine) => ({
        ...routine,
        exercises: cloneDefaultExercises(),
      }));
      pushToast('Default dumbbell exercises restored.');
    },

    updateSettings(next: Partial<WorkoutSettings>) {
      const timingChanged =
        (next.workSec !== undefined && next.workSec !== activeRoutine.settings.workSec) ||
        (next.restSec !== undefined && next.restSec !== activeRoutine.settings.restSec) ||
        (next.rounds !== undefined && next.rounds !== activeRoutine.settings.rounds) ||
        (next.includeWarmup !== undefined &&
          next.includeWarmup !== activeRoutine.settings.includeWarmup) ||
        (next.includeCooldown !== undefined &&
          next.includeCooldown !== activeRoutine.settings.includeCooldown);

      updateActiveRoutine(
        (routine) => ({
          ...routine,
          settings: { ...routine.settings, ...next },
        }),
        { resetTimeline: timingChanged },
      );

      if (timingChanged) {
        pushToast('Timer settings saved and applied.', 'success');
      }
    },

    toggleSound() {
      const nextSound = !activeRoutine.settings.soundEnabled;
      this.updateSettings({ soundEnabled: nextSound });
      pushToast(nextSound ? 'Interval beeps enabled' : 'Interval beeps muted');
    },

    toggleVoice() {
      const nextVoice = !activeRoutine.settings.voiceEnabled;
      this.updateSettings({ voiceEnabled: nextVoice });
      pushToast(nextVoice ? 'Voice announcements enabled' : 'Voice announcements muted');
    },

    setDemoSpeed(speed: number) {
      const clamped = Math.min(1.5, Math.max(0.5, speed));
      this.updateSettings({ demoSpeed: clamped });
    },

    testAudioBeep() {
      const prev = audio.isEnabled();
      audio.setEnabled(true);
      audio.beepWorkStart();
      audio.setEnabled(prev);
      pushToast('Playing interval start beep!');
    },

    testVoice() {
      if (!voice.isSupported()) {
        pushToast('Speech synthesis is not supported in this browser.', 'error');
        return;
      }
      voice.testVoice();
      pushToast('Testing voice coaching cue!');
    },

    logManualSession() {
      recordSession('manual');
      notify();
      pushToast('Workout session logged!', 'success');
    },

    exportJson() {
      return serializeBackupJson(data);
    },

    importJson(jsonText: string) {
      const result = parseBackupJson(jsonText, data);
      if (!result.ok) {
        pushToast(result.error, 'error');
        return false;
      }

      data = result.data;
      activeRoutine = getActiveRoutine(data);
      audio.setEnabled(activeRoutine.settings.soundEnabled);
      voice.setEnabled(activeRoutine.settings.voiceEnabled);
      timeline = buildCircuitTimeline(activeRoutine.exercises, activeRoutine.settings);
      totalDurationSec = computeTotalDuration(timeline);
      previewExerciseId = null;
      voice.cancel();
      void wakeLock.release();
      timer.setTimeline(timeline, { preserveProgress: false });
      persistData();
      notify();
      pushToast('Workout routine imported & saved!', 'success');
      return true;
    },

    pushToast,
    dismissToast,

    destroy() {
      timer.destroy();
      voice.cancel();
      void wakeLock.release();
      toastTimers.forEach((handle) => clearTimeout(handle));
      toastTimers.clear();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    },
  };
}
