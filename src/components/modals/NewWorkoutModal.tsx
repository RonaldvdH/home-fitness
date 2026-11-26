import { useMemo, useState } from 'preact/hooks';
import {
  generateWorkoutPreset,
  TARGET_MUSCLE_GROUP_OPTIONS,
  WORKOUT_DURATIONS,
  type TargetMuscleGroup,
  type WorkoutDurationMin,
} from '../../domain/presets';
import type { WorkoutSettings } from '../../domain/schema';
import { formatMMSS } from '../../domain/timeline';
import { ModalDialog } from './ModalDialog';

export interface NewWorkoutModalProps {
  open: boolean;
  currentSettings: WorkoutSettings;
  onClose: () => void;
  onApply: (durationMin: WorkoutDurationMin, target: TargetMuscleGroup, autoStart: boolean) => void;
}

const DURATION_TAGLINES: Record<WorkoutDurationMin, string> = {
  10: 'Quick Express',
  15: 'Classic Circuit',
  20: 'Full Burn',
};

export function NewWorkoutModal({ open, currentSettings, onClose, onApply }: NewWorkoutModalProps) {
  const [durationMin, setDurationMin] = useState<WorkoutDurationMin>(15);
  const [target, setTarget] = useState<TargetMuscleGroup>('upper');

  const preview = useMemo(
    () => generateWorkoutPreset(durationMin, target, currentSettings),
    [durationMin, target, currentSettings],
  );

  const handleApply = (autoStart: boolean): void => {
    onApply(durationMin, target, autoStart);
    onClose();
  };

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

        {/* Live Workout Plan Preview */}
        <div
          data-testid="new-workout-preview"
          class="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2"
        >
          <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span class="font-bold text-white">{preview.routineName}</span>
            <span class="font-mono font-bold text-emerald-400">
              {formatMMSS(preview.estimatedDurationSec)} total
            </span>
          </div>
          <p class="text-[11px] text-slate-400">
            {preview.exercises.length} exercises • {preview.settings.rounds} rounds •{' '}
            {preview.settings.workSec}s work / {preview.settings.restSec}s rest • Warm-up &
            Cool-down included
          </p>
          <div class="flex flex-wrap gap-1.5 pt-0.5">
            {preview.exercises.map((ex) => (
              <span
                key={ex.id}
                class="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300"
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
