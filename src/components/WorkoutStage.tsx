import { formatDumbbellWeight, type Exercise, type TimelineStep } from '../domain/schema';
import { ExerciseDemonstrator } from './ExerciseDemonstrator';
import { BoltIcon } from './icons';
import { resolveSpotlightClass } from './phaseTheme';
import { SegmentedControl } from './ui/segmented-control';

export interface WorkoutStageProps {
  routineName: string;
  currentStep: TimelineStep;
  nextStep: TimelineStep | null;
  previewExercise: Exercise | null;
  isCompleted: boolean;
  demoSpeed: number;
  stagePaused?: boolean;
  onSetDemoSpeed: (speed: number) => void;
  onClearPreview: () => void;
  onOpenNewWorkout: () => void;
}

export function WorkoutStage({
  routineName,
  currentStep,
  nextStep,
  previewExercise,
  isCompleted,
  demoSpeed,
  stagePaused = false,
  onSetDemoSpeed,
  onClearPreview,
  onOpenNewWorkout,
}: WorkoutStageProps) {
  const isPreview = previewExercise !== null;
  const activeExercise = previewExercise ?? currentStep.exercise;

  const spotlightClass = resolveSpotlightClass(currentStep.phase, isPreview, isCompleted);
  const weightLabel = formatDumbbellWeight(activeExercise.equipment);

  return (
    <section class="lg:col-span-8 min-w-0 flex flex-col gap-4">
      <div class="rounded-3xl bg-slate-900 border border-slate-800/90 overflow-hidden shadow-2xl">
        {/* Active Routine Quick-Setup Strip */}
        <div class="px-3.5 sm:px-7 py-2.5 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between gap-2 text-xs">
          <span
            data-testid="active-routine-name"
            class="font-semibold text-slate-300 truncate min-w-0"
          >
            {routineName}
          </span>
          <button
            type="button"
            onClick={onOpenNewWorkout}
            class="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 font-bold text-xs flex items-center gap-1.5 shrink-0 transition active:scale-95"
          >
            <BoltIcon />
            <span>New Workout</span>
          </button>
        </div>

        {/* Workout Completed Banner */}
        {isCompleted && !isPreview && (
          <div class="px-3.5 sm:px-7 py-2 bg-emerald-950/60 border-b border-emerald-500/30 flex items-center justify-between gap-2 text-xs">
            <span class="font-semibold text-emerald-200 min-w-0 truncate">
              Workout complete!
              <span class="hidden sm:inline"> Ready to switch it up?</span>
            </span>
            <button
              type="button"
              onClick={onOpenNewWorkout}
              class="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shrink-0 transition"
            >
              Start Another
            </button>
          </div>
        )}

        {/* Non-destructive Preview Banner */}
        {isPreview && (
          <div class="px-3.5 sm:px-7 py-2 bg-purple-950/60 border-b border-purple-500/30 flex items-center justify-between gap-2 text-xs">
            <span class="font-semibold text-purple-200 min-w-0 truncate">
              Previewing exercise
              <span class="hidden sm:inline"> — your workout progress is preserved.</span>
            </span>
            <button
              type="button"
              onClick={onClearPreview}
              class="px-3 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/40 text-purple-100 font-bold shrink-0 transition"
            >
              Back to Workout
            </button>
          </div>
        )}

        {/* Top Exercise Header Bar (full-width stacked rows on <sm, 2-column split on sm+) */}
        <div
          data-testid="exercise-header"
          class="px-3.5 sm:px-7 py-3 sm:py-5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4 bg-slate-900/60"
        >
          <div class="min-w-0 w-full sm:flex-1">
            <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
              <span
                data-testid="exercise-equipment-badge"
                class="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2 sm:px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap max-w-full truncate"
              >
                {activeExercise.equipment.label}
              </span>
              <span class="text-xs font-medium text-slate-400 min-w-0 truncate">
                {activeExercise.muscleGroup}
              </span>
            </div>
            <h2
              data-testid="active-exercise-title"
              class="text-lg sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-snug break-words"
            >
              {activeExercise.name}
            </h2>
          </div>

          {/* Animation Tempo Control Pill */}
          <div class="flex items-center justify-between sm:justify-start gap-2 sm:gap-1 bg-slate-950 p-1 pl-2.5 sm:pl-1 rounded-xl border border-slate-800 text-xs w-full sm:w-auto shrink-0">
            <span class="sm:px-2 text-slate-400 sm:text-slate-500 font-medium">
              <span class="sm:hidden">Demo Pace</span>
              <span class="hidden sm:inline">Pace:</span>
            </span>
            <SegmentedControl<'slow' | 'normal'>
              value={demoSpeed < 0.9 ? 'slow' : 'normal'}
              onChange={(next) => onSetDemoSpeed(next === 'slow' ? 0.65 : 1)}
              ariaLabel="Demo animation pace"
              options={[
                { value: 'slow', label: 'Slow' },
                { value: 'normal', label: 'Normal' },
              ]}
              className="border-0 bg-transparent p-0"
            />
          </div>
        </div>

        {/* Centerpiece Split: Left = 60fps 3D/2D Stage | Right = Coaching Cues */}
        <div class="grid grid-cols-1 md:grid-cols-12">
          <div
            class={`md:col-span-7 min-w-0 ${spotlightClass} relative flex flex-col items-center justify-center p-2 sm:p-4 min-h-[270px] sm:min-h-[380px] border-b md:border-b-0 md:border-r border-slate-800/80`}
          >
            <ExerciseDemonstrator
              animationType={activeExercise.animationType}
              muscleGroup={activeExercise.muscleGroup}
              speedMultiplier={demoSpeed}
              weightLabel={weightLabel}
              paused={stagePaused}
            />
          </div>

          <div class="md:col-span-5 min-w-0 p-4 sm:p-6 flex flex-col justify-between bg-slate-900/40">
            <div>
              <h3 class="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5">
                <svg
                  class="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  aria-hidden="true"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                How To Perform
              </h3>

              <ol class="space-y-3.5 text-sm text-slate-200 leading-relaxed">
                {activeExercise.steps.map((stepText, idx) => (
                  <li key={idx} class="flex items-start gap-3">
                    <span class="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{stepText}</span>
                  </li>
                ))}
              </ol>

              <div class="mt-5 p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/90">
                <span class="text-[11px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                  Pro Form Tip
                </span>
                <p class="text-xs text-slate-300 leading-relaxed">
                  {activeExercise.tip ||
                    'Keep your core engaged and control every repetition with steady breathing.'}
                </p>
              </div>
            </div>

            <div class="mt-6 pt-4 border-t border-slate-800/80">
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold uppercase tracking-wider text-slate-500">Up Next</span>
                <span class="font-mono text-emerald-400 font-semibold">
                  {nextStep ? `${nextStep.duration}s` : 'Done'}
                </span>
              </div>
              <p class="text-sm font-semibold text-slate-200 truncate mt-0.5">
                {nextStep ? `${nextStep.phase}: ${nextStep.exercise.name}` : 'Finish & Log Session'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
