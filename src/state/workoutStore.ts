/**
 * Encapsulated reactive workout store.
 * Coordinates persisted AppDataV4, Workout Spaces, timeline derivation, wall-clock timer,
 * non-destructive exercise preview, audio/voice cues, Wake Lock, and toasts.
 */

import { cloneDefaultExercises } from '../domain/defaults';
import type { GeneratedWorkoutPreset } from '../domain/presets';
import {
  applySpaceToExercise,
  MAX_HISTORY_RECORDS,
  type Exercise,
  type Routine,
  type WorkoutSettings,
  type WorkoutSpace,
  type WorkoutStyle,
} from '../domain/schema';
import { buildCircuitTimeline, computeTotalDuration } from '../domain/timeline';
import {
  createWorkoutTimer,
  type TimerSnapshot,
  type WorkoutTimerController,
} from '../engine/timer';
import { createAudioCoach } from '../services/audio';
import { createVoiceCoach } from '../services/speech';
import {
  createLocalStorageAdapter,
  parseBackupJson,
  serializeBackupJson,
} from '../services/storage';
import { createWakeLockController } from '../services/wakeLock';
import {
  applyPresetMetadataToData,
  buildSavedExercise,
  createSessionRecord,
  didTimingSettingsChange,
  getActiveRoutine,
  getActiveSpace,
  removeSpaceFromData,
  reorderExercises,
  toggleExerciseActiveInList,
  upsertSpaceInData,
  type ExerciseFormInput,
  type IdGenerator,
  type SpaceFormInput,
} from './mutations';
import { createToastQueue } from './toastQueue';
import type {
  StoreListener,
  WorkoutStore,
  WorkoutStoreDependencies,
  WorkoutStoreState,
} from './types';

export type { ExerciseFormInput, IdGenerator, SpaceFormInput } from './mutations';
export type { ToastAction, ToastItem, ToastOptions, ToastVariant } from './toastQueue';
export type { WorkoutStore, WorkoutStoreDependencies, WorkoutStoreState } from './types';

export function createWorkoutStore(deps: WorkoutStoreDependencies = {}): WorkoutStore {
  const storage = deps.storage ?? createLocalStorageAdapter();
  const now = deps.now ?? (() => Date.now());
  const createId: IdGenerator =
    deps.createId ?? ((prefix) => `${prefix}-${now()}-${Math.random().toString(36).slice(2, 7)}`);

  let data = storage.load();
  let activeRoutine = getActiveRoutine(data);
  let activeSpace = getActiveSpace(data);

  const audio = deps.audio ?? createAudioCoach(activeRoutine.settings.soundEnabled);
  const voice = deps.voice ?? createVoiceCoach(activeRoutine.settings.voiceEnabled);
  const wakeLock = deps.wakeLock ?? createWakeLockController();

  let timeline = buildCircuitTimeline(activeRoutine.exercises, activeRoutine.settings);
  let totalDurationSec = computeTotalDuration(timeline);
  let previewExerciseId: string | null = null;
  let previewExerciseItem: Exercise | null = null;
  let storageWarningShown = false;

  const listeners = new Set<StoreListener>();
  let cachedState: WorkoutStoreState;

  const toastQueue = createToastQueue(() => notify());

  function buildSnapshot(timerSnap: TimerSnapshot): WorkoutStoreState {
    return {
      data,
      activeRoutine,
      activeSpace,
      preferredStyle: data.preferredStyle ?? 'strength',
      timeline,
      totalDurationSec,
      timer: timerSnap,
      previewExerciseId,
      previewExerciseItem,
      toasts: toastQueue.getToasts(),
      voiceSupported: voice.isSupported(),
    };
  }

  function notify(): void {
    cachedState = buildSnapshot(timer.getSnapshot());
    listeners.forEach((listener) => listener());
  }

  function persistData(): boolean {
    const saved = storage.save(data);
    if (!saved && !storageWarningShown) {
      storageWarningShown = true;
      toastQueue.push(
        'Could not save to browser storage. Export a JSON backup in Settings.',
        'error',
        { persistent: true },
      );
    }
    return saved;
  }

  function recordSession(source: 'completed' | 'manual'): void {
    const entry = createSessionRecord(activeRoutine, totalDurationSec, source, now(), createId);
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
        toastQueue.push('Circuit complete! Session saved to your workout history.', 'success');
      },
    },
    deps.clock,
  );

  cachedState = buildSnapshot(timer.getSnapshot());

  function clearPreviewState(): void {
    previewExerciseId = null;
    previewExerciseItem = null;
  }

  function resetTimelineState(): void {
    timeline = buildCircuitTimeline(activeRoutine.exercises, activeRoutine.settings);
    totalDurationSec = computeTotalDuration(timeline);
    clearPreviewState();
    voice.cancel();
    void wakeLock.release();
    timer.setTimeline(timeline, { preserveProgress: false });
  }

  function updateActiveRoutine(
    updater: (routine: Routine) => Routine,
    options?: { resetTimeline?: boolean },
  ): void {
    const updated = {
      ...updater(activeRoutine),
      updatedAt: new Date(now()).toISOString(),
    };
    data = {
      ...data,
      routines: data.routines.map((r) => (r.id === updated.id ? updated : r)),
    };
    activeRoutine = updated;
    audio.setEnabled(activeRoutine.settings.soundEnabled);
    voice.setEnabled(activeRoutine.settings.voiceEnabled);

    if (options?.resetTimeline !== false) {
      resetTimelineState();
    }
    persistData();
    notify();
  }

  const handleVisibilityChange = (): void => {
    if (timer.getSnapshot().status === 'running') {
      timer.sync();
      wakeLock.handleVisibilityChange(true);
    }
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  return {
    getState: () => cachedState,

    subscribe(listener: StoreListener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    start() {
      clearPreviewState();
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
      if (timer.getSnapshot().status === 'running') this.pause();
      else this.start();
    },

    reset() {
      clearPreviewState();
      voice.cancel();
      void wakeLock.release();
      timer.reset();
    },

    stepForward() {
      clearPreviewState();
      voice.cancel();
      timer.stepForward();
    },

    stepBackward() {
      clearPreviewState();
      voice.cancel();
      timer.stepBackward();
    },

    previewExercise(exerciseId: string) {
      const target = activeRoutine.exercises.find((ex) => ex.id === exerciseId);
      if (!target) return;
      if (timer.getSnapshot().status === 'running') this.pause();
      previewExerciseId = exerciseId;
      previewExerciseItem = target;
      notify();
    },

    previewCatalogExercise(exercise: Exercise) {
      if (timer.getSnapshot().status === 'running') this.pause();
      const adapted = applySpaceToExercise(exercise, activeSpace);
      previewExerciseId = adapted.id;
      previewExerciseItem = adapted;
      notify();
    },

    clearPreview() {
      if (previewExerciseId !== null || previewExerciseItem !== null) {
        clearPreviewState();
        notify();
      }
    },

    addCatalogExercise(exercise: Exercise) {
      const adapted = { ...applySpaceToExercise(exercise, activeSpace), active: true };
      const existing = activeRoutine.exercises.find((item) => item.id === adapted.id);
      if (existing) {
        if (!existing.active) this.toggleExerciseActive(existing.id);
        else toastQueue.push(`"${adapted.name}" is already in your circuit.`);
        return;
      }
      updateActiveRoutine((r) => ({ ...r, exercises: [...r.exercises, adapted] }));
      toastQueue.push(`Added "${adapted.name}" to your circuit.`, 'success');
    },

    saveExercise(input: ExerciseFormInput) {
      const existing = input.id
        ? activeRoutine.exercises.find((item) => item.id === input.id)
        : undefined;
      const next = buildSavedExercise(input, existing, createId);
      if (!next) return;
      updateActiveRoutine((r) => ({
        ...r,
        exercises: existing
          ? r.exercises.map((item) => (item.id === existing.id ? next : item))
          : [...r.exercises, next],
      }));
      toastQueue.push(
        existing ? `Updated "${next.name}".` : `Added "${next.name}" and saved.`,
        'success',
      );
    },

    moveExercise(index: number, delta: -1 | 1) {
      const reordered = reorderExercises(activeRoutine.exercises, index, delta);
      if (reordered) updateActiveRoutine((r) => ({ ...r, exercises: reordered }));
    },

    toggleExerciseActive(exerciseId: string) {
      const toggled = toggleExerciseActiveInList(activeRoutine.exercises, exerciseId);
      if (!toggled) return;
      updateActiveRoutine((r) => ({ ...r, exercises: toggled.exercises }));
      toastQueue.push(
        toggled.nextActive
          ? `Enabled "${toggled.target.name}"`
          : `Disabled "${toggled.target.name}"`,
      );
    },

    deleteExercise(exerciseId: string) {
      if (activeRoutine.exercises.length <= 1) {
        toastQueue.push('Keep at least one exercise in your circuit.', 'error');
        return;
      }
      updateActiveRoutine((r) => ({
        ...r,
        exercises: r.exercises.filter((item) => item.id !== exerciseId),
      }));
      toastQueue.push('Exercise removed and saved.');
    },

    restoreDefaultExercises() {
      updateActiveRoutine((r) => ({ ...r, exercises: cloneDefaultExercises() }));
      toastQueue.push('Default dumbbell exercises restored.');
    },

    applyWorkoutPreset(preset: GeneratedWorkoutPreset, options?: { autoStart?: boolean }) {
      if (preset.exercises.length === 0) {
        toastQueue.push('No exercises matched this Space and filter combination.', 'error');
        return;
      }
      data = applyPresetMetadataToData(data, preset.spaceId, preset.style);
      activeSpace = getActiveSpace(data);
      updateActiveRoutine((routine) => ({
        ...routine,
        name: preset.routineName,
        exercises: structuredClone(preset.exercises) as Exercise[],
        settings: { ...routine.settings, ...preset.settings },
      }));
      if (options?.autoStart) {
        this.start();
        toastQueue.push(`Started ${preset.routineName}!`, 'success');
      } else {
        toastQueue.push(`Loaded ${preset.routineName}.`, 'success');
      }
    },

    selectSpace(spaceId: string) {
      const target = data.spaces.find((s) => s.id === spaceId);
      if (!target || target.id === data.activeSpaceId) return;
      data = { ...data, activeSpaceId: target.id };
      activeSpace = target;
      persistData();
      notify();
    },

    setPreferredStyle(style: WorkoutStyle) {
      if ((data.preferredStyle ?? 'strength') === style) return;
      data = { ...data, preferredStyle: style };
      persistData();
      notify();
    },

    saveSpace(input: SpaceFormInput): WorkoutSpace | null {
      const result = upsertSpaceInData(data, input, createId);
      if (!result) {
        toastQueue.push('Please enter a name for your workout space.', 'error');
        return null;
      }
      data = result.nextData;
      activeSpace = result.space;
      persistData();
      notify();
      toastQueue.push(
        result.isUpdate ? `Updated "${result.space.name}".` : `Added "${result.space.name}" space.`,
        'success',
      );
      return result.space;
    },

    deleteSpace(spaceId: string) {
      if (data.spaces.length <= 1) {
        toastQueue.push('Keep at least one workout space.', 'error');
        return;
      }
      const result = removeSpaceFromData(data, spaceId);
      if (!result) return;
      data = result.nextData;
      activeSpace = getActiveSpace(data);
      persistData();
      notify();
      toastQueue.push(`Removed "${result.removed.name}" space.`);
    },

    updateSettings(next: Partial<WorkoutSettings>) {
      const timingChanged = didTimingSettingsChange(activeRoutine.settings, next);
      updateActiveRoutine((r) => ({ ...r, settings: { ...r.settings, ...next } }), {
        resetTimeline: timingChanged,
      });
      if (timingChanged) toastQueue.push('Timer settings saved and applied.', 'success');
    },

    toggleSound() {
      const next = !activeRoutine.settings.soundEnabled;
      this.updateSettings({ soundEnabled: next });
      toastQueue.push(next ? 'Interval beeps enabled' : 'Interval beeps muted');
    },

    toggleVoice() {
      const next = !activeRoutine.settings.voiceEnabled;
      this.updateSettings({ voiceEnabled: next });
      toastQueue.push(next ? 'Voice announcements enabled' : 'Voice announcements muted');
    },

    setDemoSpeed(speed: number) {
      this.updateSettings({ demoSpeed: Math.min(1.5, Math.max(0.5, speed)) });
    },

    testAudioBeep() {
      const prev = audio.isEnabled();
      audio.setEnabled(true);
      audio.beepWorkStart();
      audio.setEnabled(prev);
      toastQueue.push('Playing interval start beep!');
    },

    testVoice() {
      if (!voice.isSupported()) {
        toastQueue.push('Speech synthesis is not supported in this browser.', 'error');
        return;
      }
      voice.testVoice();
      toastQueue.push('Testing voice coaching cue!');
    },

    logManualSession() {
      recordSession('manual');
      notify();
      toastQueue.push('Workout session logged!', 'success');
    },

    exportJson: () => serializeBackupJson(data),

    importJson(jsonText: string) {
      const result = parseBackupJson(jsonText, data);
      if (!result.ok) {
        toastQueue.push(result.error, 'error');
        return false;
      }
      data = result.data;
      activeRoutine = getActiveRoutine(data);
      activeSpace = getActiveSpace(data);
      audio.setEnabled(activeRoutine.settings.soundEnabled);
      voice.setEnabled(activeRoutine.settings.voiceEnabled);
      resetTimelineState();
      persistData();
      notify();
      toastQueue.push('Workout routine imported & saved!', 'success');
      return true;
    },

    pushToast: toastQueue.push,
    dismissToast: toastQueue.dismiss,

    destroy() {
      timer.destroy();
      audio.dispose();
      voice.cancel();
      void wakeLock.release();
      toastQueue.destroy();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    },
  };
}
