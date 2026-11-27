import { useEffect, useRef, useState } from 'preact/hooks';
import {
  generateWorkoutPreset,
  TARGET_MUSCLE_GROUP_OPTIONS,
  WORKOUT_DURATIONS,
  type GeneratedWorkoutPreset,
  type TargetMuscleGroup,
  type WorkoutDurationMin,
} from '../../domain/presets';
import type { Exercise, WorkoutSettings } from '../../domain/schema';
import { formatMMSS } from '../../domain/timeline';
import { ModalDialog } from './ModalDialog';

export interface NewWorkoutModalProps {
  open: boolean;
  currentSettings: WorkoutSettings;
  userExercises: readonly Exercise[];
  onClose: () => void;
  onApply: (preset: GeneratedWorkoutPreset, autoStart: boolean) => void;
}

const DURATION_TAGLINES: Record<WorkoutDurationMin, string> = {
  10: 'Quick Express',
  15: 'Classic Circuit',
  20: 'Full Burn',
};

export function NewWorkoutModal({
  open,
  currentSettings,
  userExercises,
  onClose,
  onApply,
}: NewWorkoutModalProps) {
  const [durationMin, setDurationMin] = useState<WorkoutDurationMin>(15);
  const [target, setTarget] = useState<TargetMuscleGroup>('upper');
  const [preview, setPreview] = useState<GeneratedWorkoutPreset>(() =>
    generateWorkoutPreset({
      durationMin: 15,
      target: 'upper',
      currentSettings,
      userExercises,
    }),
  );

  const lastSyncedRef = useRef({ open, durationMin, target, currentSettings, userExercises });

  // Re-build a fresh varied lineup whenever the overlay re-opens or filters change.
  useEffect(() => {
    const prev = lastSyncedRef.current;
    lastSyncedRef.current = { open, durationMin, target, currentSettings, userExercises };
    if (
      !open ||
      (prev.open === open &&
        prev.durationMin === durationMin &&
        prev.target === target &&
        prev.currentSettings === currentSettings &&
        prev.userExercises === userExercises)
    ) {
      return;
    }
    setPreview((prevPreview) =>
      generateWorkoutPreset({
        durationMin,
        target,
        currentSettings,
        userExercises,
        previousExerciseIds: prevPreview.exercises.map((e) => e.id),
      }),
    );
  }, [open, durationMin, target, currentSettings, userExercises]);

  const handleShuffle = (): void => {
    setPreview((prev) =>
      generateWorkoutPreset({
        durationMin,
        target,
        currentSettings,
        userExercises,
        previousExerciseIds: prev.exercises.map((e) => e.id),
      }),
    );
  };

  const handleApply = (autoStart: boolean): void => {
    onApply(preview, autoStart);
    onClose();
  };

  const canShuffle = preview.matchingPoolSize > preview.exercises.length;

  return (
    <ModalDialog
      open={open}
      title="Start a New Workout"
      titleId="modal-new-workout-heading"
      maxWidthClass="max-w-lg"
      onClose={onClose}
    >
      <div class="space-y-4">
        {/* Question 1: Duration */}
        <div>
          <p class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">1. Duration</p>
          <div class="grid grid-cols-3 gap-2">
            {WORKOUT_DURATIONS.map((mins) => {
              const selected = durationMin === mins;
              return (
                <button
                  key={mins}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setDurationMin(mins)}
                  class={`p-2.5 sm:p-3 rounded-2xl border text-center transition active:scale-95 ${
                    selected
                      ? 'bg-emerald-500/15 border-emerald-400 text-white shadow-sm shadow-emerald-500/10'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span class="block font-mono text-lg sm:text-xl font-extrabold leading-tight">
                    {mins} min
                  </span>
                  <span
                    class={`block text-[11px] mt-0.5 ${
                      selected ? 'text-emerald-300' : 'text-slate-500'
                    }`}
                  >
                    {DURATION_TAGLINES[mins]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Question 2: Target Muscle Group */}
        <div>
          <p class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            2. Target Muscle Group
          </p>
          <div class="grid grid-cols-2 gap-2">
            {TARGET_MUSCLE_GROUP_OPTIONS.map((opt) => {
              const selected = target === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setTarget(opt.id)}
                  class={`p-3 rounded-2xl border text-left transition active:scale-95 ${
                    selected
                      ? 'bg-emerald-500/15 border-emerald-400 text-white shadow-sm shadow-emerald-500/10'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span class="block text-sm font-bold leading-snug">{opt.label}</span>
                  <span
                    class={`block text-[11px] mt-0.5 leading-snug ${
                      selected ? 'text-emerald-200/90' : 'text-slate-500'
                    }`}
                  >
                    {opt.subtitle}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Varied Workout Plan Preview */}
        <div
          data-testid="new-workout-preview"
          class="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2"
        >
          <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div class="flex items-center gap-2 min-w-0">
              <span class="font-bold text-white truncate">{preview.routineName}</span>
              <span class="font-mono font-bold text-emerald-400 shrink-0">
                {formatMMSS(preview.estimatedDurationSec)}
              </span>
            </div>

            {canShuffle && (
              <button
                type="button"
                onClick={handleShuffle}
                class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-semibold text-emerald-300 flex items-center gap-1 transition active:scale-95"
              >
                <svg
                  class="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  aria-hidden="true"
                >
                  <polyline points="16 3 21 3 21 8" />
                  <line x1="4" y1="20" x2="21" y2="3" />
                  <polyline points="21 16 21 21 16 21" />
                  <line x1="15" y1="15" x2="21" y2="21" />
                  <line x1="4" y1="4" x2="9" y2="9" />
                </svg>
                <span>Shuffle</span>
              </button>
            )}
          </div>

          <p class="text-[11px] text-slate-400">
            Picked {preview.exercises.length} of {preview.matchingPoolSize} tagged moves •{' '}
            {preview.settings.rounds} rounds ({preview.settings.workSec}s /{' '}
            {preview.settings.restSec}s)
          </p>

          <div class="flex flex-wrap gap-1.5 pt-0.5">
            {preview.exercises.map((ex) => (
              <span
                key={ex.id}
                class="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-200"
              >
                {ex.name}
              </span>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => handleApply(false)}
            class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs sm:text-sm font-semibold text-slate-200 transition"
          >
            Load & Preview
          </button>
          <button
            type="button"
            onClick={() => handleApply(true)}
            class="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-sm font-extrabold text-slate-950 shadow-md shadow-emerald-500/20 transition active:scale-95"
          >
            Start Workout
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
