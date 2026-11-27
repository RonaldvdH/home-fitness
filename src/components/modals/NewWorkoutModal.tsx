import { useEffect, useRef, useState } from 'preact/hooks';
import {
  generateWorkoutPreset,
  TARGET_MUSCLE_GROUP_OPTIONS,
  WORKOUT_DURATIONS,
  type GeneratedWorkoutPreset,
  type TargetMuscleGroup,
  type WorkoutDurationMin,
} from '../../domain/presets';
import {
  EQUIPMENT_TAG_LABELS,
  type Exercise,
  type WorkoutSettings,
  type WorkoutSpace,
} from '../../domain/schema';
import { formatMMSS } from '../../domain/timeline';
import { ModalDialog } from './ModalDialog';

export interface NewWorkoutModalProps {
  open: boolean;
  currentSettings: WorkoutSettings;
  userExercises: readonly Exercise[];
  spaces: readonly WorkoutSpace[];
  activeSpace: WorkoutSpace;
  onSelectSpace: (spaceId: string) => void;
  onManageSpaces: () => void;
  onClose: () => void;
  onApply: (preset: GeneratedWorkoutPreset, autoStart: boolean) => void;
}

const DURATION_TAGLINES: Record<WorkoutDurationMin, string> = {
  10: 'Quick Express',
  15: 'Classic Circuit',
  20: 'Full Burn',
};

function formatSpaceSummary(space: WorkoutSpace): string {
  if (space.availableEquipment.length === 0) return 'Standing Bodyweight only';
  return space.availableEquipment
    .map((tag) =>
      tag === 'dumbbells' ? `${space.dumbbellWeightKg}kg DB` : EQUIPMENT_TAG_LABELS[tag],
    )
    .join(' • ');
}

export function NewWorkoutModal({
  open,
  currentSettings,
  userExercises,
  spaces,
  activeSpace,
  onSelectSpace,
  onManageSpaces,
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
      space: activeSpace,
      userExercises,
    }),
  );

  const lastSyncedRef = useRef({
    open,
    durationMin,
    target,
    currentSettings,
    activeSpace,
    userExercises,
  });

  // Re-build a fresh varied lineup whenever the overlay re-opens, Space changes, or filters change.
  useEffect(() => {
    const prev = lastSyncedRef.current;
    lastSyncedRef.current = {
      open,
      durationMin,
      target,
      currentSettings,
      activeSpace,
      userExercises,
    };
    if (
      !open ||
      (prev.open === open &&
        prev.durationMin === durationMin &&
        prev.target === target &&
        prev.currentSettings === currentSettings &&
        prev.activeSpace === activeSpace &&
        prev.userExercises === userExercises)
    ) {
      return;
    }
    setPreview((prevPreview) =>
      generateWorkoutPreset({
        durationMin,
        target,
        currentSettings,
        space: activeSpace,
        userExercises,
        previousExerciseIds: prevPreview.exercises.map((e) => e.id),
      }),
    );
  }, [open, durationMin, target, currentSettings, activeSpace, userExercises]);

  const handleShuffle = (): void => {
    setPreview((prev) =>
      generateWorkoutPreset({
        durationMin,
        target,
        currentSettings,
        space: activeSpace,
        userExercises,
        previousExerciseIds: prev.exercises.map((e) => e.id),
      }),
    );
  };

  const handleApply = (autoStart: boolean): void => {
    if (preview.exercises.length === 0) return;
    onApply(preview, autoStart);
    onClose();
  };

  const canShuffle = preview.matchingPoolSize > preview.exercises.length;
  const hasMatches = preview.exercises.length > 0;

  return (
    <ModalDialog
      open={open}
      title="Start a New Workout"
      titleId="modal-new-workout-heading"
      maxWidthClass="max-w-lg"
      onClose={onClose}
    >
      <div class="space-y-3.5">
        {/* Question 1: Workout Space */}
        <div>
          <div class="flex items-center justify-between gap-2 mb-1.5">
            <p class="text-xs font-bold uppercase tracking-wider text-slate-400">
              1. Workout Space
            </p>
            <button
              type="button"
              onClick={onManageSpaces}
              class="px-2 py-0.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white flex items-center gap-1 transition"
            >
              <svg
                class="w-3 h-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Manage Spaces</span>
            </button>
          </div>
          <div class="flex flex-wrap gap-1.5" role="group" aria-label="Workout Space">
            {spaces.map((space) => {
              const selected = space.id === activeSpace.id;
              return (
                <button
                  key={space.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelectSpace(space.id)}
                  class={`px-3 py-1.5 rounded-xl border text-xs font-bold transition active:scale-95 ${
                    selected
                      ? 'bg-emerald-500/15 border-emerald-400 text-white shadow-sm shadow-emerald-500/10'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {space.name}
                </button>
              );
            })}
          </div>
          <p
            data-testid="active-space-equipment-summary"
            class="text-[11px] text-slate-400 mt-1.5 truncate"
          >
            {formatSpaceSummary(activeSpace)}
          </p>
        </div>

        {/* Question 2: Duration */}
        <div>
          <p class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            2. Duration
          </p>
          <div class="grid grid-cols-3 gap-2">
            {WORKOUT_DURATIONS.map((mins) => {
              const selected = durationMin === mins;
              return (
                <button
                  key={mins}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setDurationMin(mins)}
                  class={`p-2 sm:p-2.5 rounded-2xl border text-center transition active:scale-95 ${
                    selected
                      ? 'bg-emerald-500/15 border-emerald-400 text-white shadow-sm shadow-emerald-500/10'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span class="block font-mono text-base sm:text-lg font-extrabold leading-tight">
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

        {/* Question 3: Target Muscle Group */}
        <div>
          <p class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            3. Target Muscle Group
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
                  class={`p-2.5 rounded-2xl border text-left transition active:scale-95 ${
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
          {hasMatches ? (
            <>
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
                Picked {preview.exercises.length} of {preview.matchingPoolSize} tagged moves for{' '}
                <span class="text-slate-200 font-semibold">{activeSpace.name}</span> •{' '}
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
            </>
          ) : (
            <div class="space-y-2 text-xs">
              <p class="font-semibold text-amber-300">
                No exercises match "{activeSpace.name}" for this muscle group.
              </p>
              <p class="text-[11px] text-slate-400">
                Enable more equipment in this Space (like Floor / Mat, Wall, or Elastic Bands) or
                choose another target group.
              </p>
              <button
                type="button"
                onClick={onManageSpaces}
                class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-emerald-300 transition"
              >
                Edit "{activeSpace.name}" Equipment
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div class="grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            disabled={!hasMatches}
            onClick={() => handleApply(false)}
            class="px-3 sm:px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-xs sm:text-sm font-semibold text-slate-200 transition"
          >
            Load & Preview
          </button>
          <button
            type="button"
            disabled={!hasMatches}
            onClick={() => handleApply(true)}
            class="px-3 sm:px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:pointer-events-none text-xs sm:text-sm font-extrabold text-slate-950 shadow-md shadow-emerald-500/20 transition active:scale-95"
          >
            Start Workout
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
