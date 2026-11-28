/**
 * Shared public interfaces for the reactive workout store.
 */

import type { GeneratedWorkoutPreset } from '../domain/presets';
import type {
  AppDataV4,
  Exercise,
  Routine,
  TimelineStep,
  WorkoutSettings,
  WorkoutSpace,
} from '../domain/schema';
import type { TimerClock, TimerSnapshot } from '../engine/timer';
import type { AudioCoach } from '../services/audio';
import type { VoiceCoach } from '../services/speech';
import type { StorageAdapter } from '../services/storage';
import type { WakeLockController } from '../services/wakeLock';
import type { ExerciseFormInput, IdGenerator, SpaceFormInput } from './mutations';
import type { ToastItem, ToastOptions, ToastVariant } from './toastQueue';

export interface WorkoutStoreState {
  data: AppDataV4;
  activeRoutine: Routine;
  activeSpace: WorkoutSpace;
  timeline: TimelineStep[];
  totalDurationSec: number;
  timer: TimerSnapshot;
  previewExerciseId: string | null;
  previewExerciseItem: Exercise | null;
  toasts: ToastItem[];
  voiceSupported: boolean;
}

export interface WorkoutStoreDependencies {
  storage?: StorageAdapter;
  audio?: AudioCoach;
  voice?: VoiceCoach;
  wakeLock?: WakeLockController;
  clock?: TimerClock;
  now?: () => number;
  createId?: IdGenerator;
}

export type StoreListener = () => void;

export interface WorkoutStore {
  getState: () => WorkoutStoreState;
  subscribe: (listener: StoreListener) => () => void;
  start: () => void;
  pause: () => void;
  toggleStartPause: () => void;
  reset: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  previewExercise: (exerciseId: string) => void;
  previewCatalogExercise: (exercise: Exercise) => void;
  clearPreview: () => void;
  addCatalogExercise: (exercise: Exercise) => void;
  saveExercise: (input: ExerciseFormInput) => void;
  moveExercise: (index: number, delta: -1 | 1) => void;
  toggleExerciseActive: (exerciseId: string) => void;
  deleteExercise: (exerciseId: string) => void;
  restoreDefaultExercises: () => void;
  applyWorkoutPreset: (preset: GeneratedWorkoutPreset, options?: { autoStart?: boolean }) => void;
  selectSpace: (spaceId: string) => void;
  saveSpace: (input: SpaceFormInput) => WorkoutSpace | null;
  deleteSpace: (spaceId: string) => void;
  updateSettings: (next: Partial<WorkoutSettings>) => void;
  toggleSound: () => void;
  toggleVoice: () => void;
  setDemoSpeed: (speed: number) => void;
  testAudioBeep: () => void;
  testVoice: () => void;
  logManualSession: () => void;
  exportJson: () => string;
  importJson: (jsonText: string) => boolean;
  pushToast: (message: string, variant?: ToastVariant, options?: ToastOptions) => number;
  dismissToast: (id: number) => void;
  destroy: () => void;
}
