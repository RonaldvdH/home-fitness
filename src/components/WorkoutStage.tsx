import {
  formatDumbbellWeight,
  type Exercise,
  type TimelinePhase,
  type TimelineStep,
} from '../domain/schema';
import { AthleteSvg } from './AthleteSvg';

export interface WorkoutStageProps {
  currentStep: TimelineStep;
  nextStep: TimelineStep | null;
  previewExercise: Exercise | null;
  isCompleted: boolean;
  demoSpeed: number;
  onSetDemoSpeed: (speed: number) => void;
  onClearPreview: () => void;
}

const STAGE_SPOTLIGHT_MAP: Record<TimelinePhase, string> = {
  'WARM-UP': 'stage-spotlight-warmup',
  WORK: 'stage-spotlight',
  REST: 'stage-spotlight-rest',
  'COOL-DOWN': 'stage-spotlight',
};

export function WorkoutStage({
  currentStep,
  nextStep,
  previewExercise,
  isCompleted,
  demoSpeed,
  onSetDemoSpeed,
  onClearPreview,
}: WorkoutStageProps) {
  const isPreview = previewExercise !== null;
  const activeExercise = previewExercise ?? currentStep.exercise;

  const spotlightClass = isPreview
    ? 'stage-spotlight-preview'
    : isCompleted
      ? 'stage-spotlight'
      : STAGE_SPOTLIGHT_MAP[currentStep.phase];

  const weightLabel = formatDumbbellWeight(activeExercise.equipment);

  return (
    <section class="lg:col-span-8 min-w-0 flex flex-col gap-4">
      <div class="rounded-3xl bg-slate-900 border border-slate-800/90 overflow-hidden shadow-2xl">
        {/* Non-destructive Preview Banner */}
        {isPreview && (
          <div class="px-4 sm:px-7 py-2.5 bg-purple-950/60 border-b border-purple-500/30 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span class="font-semibold text-purple-200">
              Previewing exercise — your workout progress is preserved.
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

        {/* Top Exercise Header Bar */}
        <div class="px-4 sm:px-7 py-3.5 sm:py-5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-slate-900/60">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
              <span class="text-[11px] font-bold uppercase tracking-wider px-2 sm:px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {activeExercise.equipment.label}
              </span>
              <span class="text-xs font-medium text-slate-400">{activeExercise.muscleGroup}</span>
            </div>
            <h2
              data-testid="active-exercise-title"
              class="text-lg sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight break-words"
            >
              {activeExercise.name}
            </h2>
          </div>

          {/* Animation Tempo Control Pill */}
          <div class="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs shrink-0">
            <span class="px-1.5 sm:px-2 text-slate-500 font-medium">Pace:</span>
            <button
              type="button"
              onClick={() => onSetDemoSpeed(0.65)}
              aria-pressed={demoSpeed < 0.9}
              class={`px-2.5 py-1 rounded-lg transition ${
                demoSpeed < 0.9
                  ? 'bg-slate-800 text-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Slow
            </button>
            <button
              type="button"
              onClick={() => onSetDemoSpeed(1)}
              aria-pressed={demoSpeed >= 0.9}
              class={`px-2.5 py-1 rounded-lg transition ${
                demoSpeed >= 0.9
                  ? 'bg-slate-800 text-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Normal
            </button>
          </div>
        </div>

        {/* Centerpiece Split: Left = 60fps SVG Stage | Right = Coaching Cues */}
        <div class="grid grid-cols-1 md:grid-cols-12">
          <div
            class={`md:col-span-7 min-w-0 ${spotlightClass} relative flex flex-col items-center justify-center p-4 pt-12 sm:p-8 min-h-[260px] sm:min-h-[380px] border-b md:border-b-0 md:border-r border-slate-800/80`}
          >
            <AthleteSvg
              animationType={activeExercise.animationType}
              speedMultiplier={demoSpeed}
              weightLabel={weightLabel}
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
