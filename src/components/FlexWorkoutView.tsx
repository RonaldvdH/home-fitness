import { cn } from '@/lib/utils';
import {
  formatDumbbellWeight,
  type Exercise,
  type TimelinePhase,
  type TimelineStep,
} from '../domain/schema';
import { formatMMSS } from '../domain/timeline';
import type { TimerSnapshot } from '../engine/timer';
import type { FloorModeActivation } from '../services/foldable';
import { ExerciseDemonstrator } from './ExerciseDemonstrator';

export interface FlexWorkoutViewProps {
  routineName: string;
  currentStep: TimelineStep;
  nextStep: TimelineStep | null;
  totalSteps: number;
  timer: TimerSnapshot;
  previewExercise: Exercise | null;
  demoSpeed: number;
  stagePaused?: boolean;
  soundEnabled: boolean;
  voiceEnabled: boolean;
  voiceSupported: boolean;
  activation: FloorModeActivation;
  onToggleStartPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
  onToggleSound: () => void;
  onToggleVoice: () => void;
  onSetDemoSpeed: (speed: number) => void;
  onClearPreview: () => void;
  onOpenNewWorkout: () => void;
  onExitFloorMode: () => void;
}

const PHASE_BADGE_STYLES: Record<TimelinePhase, { badge: string; stroke: string; label: string }> =
  {
    'WARM-UP': {
      badge: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
      stroke: '#fbbf24',
      label: 'WARM-UP',
    },
    WORK: {
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
      stroke: '#10b981',
      label: 'WORK',
    },
    REST: {
      badge: 'bg-sky-500/20 text-sky-300 border-sky-400/40',
      stroke: '#38bdf8',
      label: 'REST',
    },
    'COOL-DOWN': {
      badge: 'bg-purple-500/20 text-purple-300 border-purple-400/40',
      stroke: '#c084fc',
      label: 'COOL-DOWN',
    },
  };

const STAGE_SPOTLIGHT_MAP: Record<TimelinePhase, string> = {
  'WARM-UP': 'stage-spotlight-warmup',
  WORK: 'stage-spotlight',
  REST: 'stage-spotlight-rest',
  'COOL-DOWN': 'stage-spotlight',
};

const RING_CIRCUMFERENCE = 87.96;

/**
 * Galaxy Z Flip Flex / Floor Mode split layout (ADR-0003).
 *
 * - Top segment (`env(viewport-segment-height 0 0, 50dvh)`): full-bleed 60 FPS athlete stage +
 *   high-contrast giant countdown timer + phase badge + live rep cue.
 * - Bottom segment (`env(viewport-segment-height 0 1, 50dvh)`): flat control deck with oversized
 *   touch transport buttons, active exercise + key form tip, compact Up Next, and quick toggles.
 */
export function FlexWorkoutView({
  routineName,
  currentStep,
  nextStep,
  totalSteps,
  timer,
  previewExercise,
  demoSpeed,
  stagePaused = false,
  soundEnabled,
  voiceEnabled,
  voiceSupported,
  activation,
  onToggleStartPause,
  onPrev,
  onNext,
  onReset,
  onToggleSound,
  onToggleVoice,
  onSetDemoSpeed,
  onClearPreview,
  onOpenNewWorkout,
  onExitFloorMode,
}: FlexWorkoutViewProps) {
  const isCompleted = timer.status === 'completed';
  const isRunning = timer.status === 'running';
  const isPreview = previewExercise !== null;
  const isAtLastStep = timer.currentIndex >= totalSteps - 1;
  const isSlowDemo = demoSpeed < 0.9;

  const activeExercise = previewExercise ?? currentStep.exercise;
  const weightLabel = formatDumbbellWeight(activeExercise.equipment);

  const phaseStyle = isCompleted
    ? {
        badge: 'bg-emerald-500 text-slate-950 border-emerald-400',
        stroke: '#10b981',
        label: 'DONE!',
      }
    : PHASE_BADGE_STYLES[currentStep.phase];

  const spotlightClass = isPreview
    ? 'stage-spotlight-preview'
    : isCompleted
      ? 'stage-spotlight'
      : STAGE_SPOTLIGHT_MAP[currentStep.phase];

  const stepDurationMs = Math.max(1, currentStep.duration * 1000);
  const ratio = isCompleted ? 0 : Math.max(0, Math.min(1, timer.remainingMs / stepDurationMs));
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - ratio);

  const overallPct = isCompleted
    ? 100
    : Math.round(((timer.currentIndex + (1 - ratio)) / Math.max(1, totalSteps)) * 100);

  const startButtonLabel = isRunning
    ? 'Pause'
    : isCompleted
      ? 'Restart'
      : timer.status === 'idle'
        ? 'Start'
        : 'Resume';

  return (
    <div
      data-slot="flex-workout-view"
      data-state={activation}
      data-testid="flex-workout-view"
      class="fixed inset-0 z-40 h-dvh w-full overflow-hidden bg-slate-950 flex flex-col justify-between select-none"
    >
      {/* TOP HALF — Angled eye-level display: Giant Timer + Phase HUD + Full-Bleed Animation */}
      <section
        data-slot="flex-top-segment"
        data-testid="flex-top-segment"
        aria-label="Floor Mode workout display"
        class={cn(
          'flex-segment-top relative w-full shrink-0 overflow-hidden flex flex-col justify-between border-b border-slate-800/90',
          spotlightClass,
        )}
      >
        {/* Top HUD Strip: Phase + Round on Left | Giant Countdown Timer on Right */}
        <div class="relative z-10 px-3.5 sm:px-6 pt-2.5 pb-1 flex items-center justify-between gap-2 shrink-0">
          <div class="flex flex-col gap-1 min-w-0">
            <div class="flex items-center gap-1.5 min-w-0">
              <span
                data-testid="phase-badge"
                class={cn(
                  'px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider border shrink-0',
                  phaseStyle.badge,
                )}
              >
                {phaseStyle.label}
              </span>
              {activation === 'auto' && (
                <span class="px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-900/80 border border-slate-700/80 text-slate-300 shrink-0">
                  Flex
                </span>
              )}
            </div>
            <div class="flex items-center gap-1.5 text-xs font-medium text-slate-300 truncate">
              <span>
                {currentStep.round === 0
                  ? 'Prep'
                  : `Round ${currentStep.round}/${currentStep.totalRounds}`}
              </span>
              <span class="text-slate-600" aria-hidden="true">
                •
              </span>
              <span data-testid="step-counter" class="font-mono text-slate-400">
                {timer.currentIndex + 1}/{totalSteps}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <svg class="w-8 h-8 -rotate-90 shrink-0" viewBox="0 0 36 36" aria-hidden="true">
              <circle cx="18" cy="18" r="14" fill="none" stroke="#1e293b" stroke-width="4" />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke={phaseStyle.stroke}
                stroke-width="4"
                stroke-linecap="round"
                stroke-dasharray={String(RING_CIRCUMFERENCE)}
                stroke-dashoffset={strokeDashoffset.toFixed(2)}
                class="transition-all duration-150"
              />
            </svg>
            <span
              data-testid="timer-display"
              class="font-mono text-4xl sm:text-5xl font-black tracking-tight text-white tabular-nums leading-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)]"
            >
              {formatMMSS(timer.remainingSec)}
            </span>
          </div>
        </div>

        {/* Full-Bleed 60 FPS 3D/2D Athlete Stage */}
        <div class="relative flex-1 min-h-0 w-full flex items-center justify-center px-2 pb-1">
          <ExerciseDemonstrator
            animationType={activeExercise.animationType}
            muscleGroup={activeExercise.muscleGroup}
            speedMultiplier={demoSpeed}
            weightLabel={weightLabel}
            variant="flex"
            paused={stagePaused}
          />

          {isPreview && (
            <span class="absolute top-1 left-3 z-20 px-2 py-0.5 rounded-md bg-purple-950/90 border border-purple-400/50 text-[11px] font-bold uppercase tracking-wider text-purple-200">
              Preview
            </span>
          )}
        </div>

        {/* Hinge-edge overall progress bar */}
        <div class="w-full h-1 bg-slate-900/90 shrink-0">
          <div
            class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </section>

      {/* BOTTOM HALF — Flat floor control deck: Utility bar + Exercise/Tip + Up Next + Giant Transport */}
      <section
        data-slot="flex-bottom-segment"
        data-testid="flex-bottom-segment"
        aria-label="Floor Mode controls"
        class="flex-segment-bottom w-full shrink-0 overflow-hidden bg-slate-950 flex flex-col justify-between gap-2 px-3.5 py-2.5 sm:px-6 sm:py-4"
      >
        {/* Row 1: Compact Utility Bar */}
        <div class="flex items-center justify-between gap-1.5 shrink-0">
          <div class="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={onOpenNewWorkout}
              aria-label="New Workout"
              title={`Active routine: ${routineName} — start a new workout`}
              class="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 font-bold text-xs flex items-center gap-1 shrink-0 transition active:scale-95"
            >
              <svg
                class="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                aria-hidden="true"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <span>Workout</span>
            </button>

            <button
              type="button"
              onClick={() => onSetDemoSpeed(isSlowDemo ? 1 : 0.65)}
              aria-label={isSlowDemo ? 'Switch demo pace to normal' : 'Switch demo pace to slow'}
              aria-pressed={isSlowDemo}
              class={cn(
                'px-2.5 py-1.5 rounded-xl border text-xs font-semibold shrink-0 transition active:scale-95',
                isSlowDemo
                  ? 'bg-slate-800 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white',
              )}
            >
              {isSlowDemo ? 'Slow' : '1x Pace'}
            </button>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onToggleSound}
              aria-label={soundEnabled ? 'Mute interval beeps' : 'Enable interval beeps'}
              aria-pressed={soundEnabled}
              title="Toggle Interval Beeps (M)"
              class="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 transition active:scale-95"
            >
              {soundEnabled ? (
                <svg
                  class="w-4 h-4 text-emerald-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              ) : (
                <svg
                  class="w-4 h-4 text-rose-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              )}
            </button>

            {voiceSupported && (
              <button
                type="button"
                onClick={onToggleVoice}
                aria-label={voiceEnabled ? 'Mute voice coaching' : 'Enable voice coaching'}
                aria-pressed={voiceEnabled}
                title="Toggle Voice Announcements (V)"
                class="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 transition active:scale-95"
              >
                <svg
                  class={cn('w-4 h-4', voiceEnabled ? 'text-sky-400' : 'text-slate-500')}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </button>
            )}

            <button
              type="button"
              onClick={onExitFloorMode}
              aria-label="Exit Floor Mode"
              title="Exit Floor Mode (F)"
              class="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1 transition active:scale-95"
            >
              <svg
                class="w-3.5 h-3.5 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                aria-hidden="true"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
              <span>Exit</span>
            </button>
          </div>
        </div>

        {/* Row 2: Active Exercise Title + Key Form Tip */}
        <div class="min-w-0 flex-1 flex flex-col justify-center gap-1.5 overflow-hidden">
          {isPreview && (
            <div class="px-2.5 py-1 rounded-xl bg-purple-950/70 border border-purple-500/35 flex items-center justify-between gap-2 text-xs shrink-0">
              <span class="font-semibold text-purple-200 truncate">Previewing exercise</span>
              <button
                type="button"
                onClick={onClearPreview}
                class="px-2 py-0.5 rounded-lg bg-purple-500/25 text-purple-100 font-bold shrink-0"
              >
                Back to Workout
              </button>
            </div>
          )}

          {isCompleted && !isPreview && (
            <div class="px-2.5 py-1 rounded-xl bg-emerald-950/70 border border-emerald-500/35 flex items-center justify-between gap-2 text-xs shrink-0">
              <span class="font-semibold text-emerald-200 truncate">Workout complete!</span>
              <button
                type="button"
                onClick={onOpenNewWorkout}
                class="px-2.5 py-0.5 rounded-lg bg-emerald-500 text-slate-950 font-bold shrink-0"
              >
                Start Another
              </button>
            </div>
          )}

          <div class="min-w-0">
            <div class="flex items-center gap-1.5 min-w-0 mb-0.5">
              <span class="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap shrink-0">
                {activeExercise.equipment.label}
              </span>
              <span class="text-[11px] font-medium text-slate-400 truncate min-w-0">
                {activeExercise.muscleGroup}
              </span>
            </div>
            <h2
              data-testid="active-exercise-title"
              class="text-base sm:text-xl font-extrabold text-white tracking-tight truncate leading-tight"
            >
              {activeExercise.name}
            </h2>
          </div>

          <div
            data-testid="flex-form-tip"
            class="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800/90 min-w-0"
          >
            <span class="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-0.5">
              Key Form Tip
            </span>
            <p class="text-xs text-slate-200 leading-snug line-clamp-2">
              {activeExercise.tip ||
                activeExercise.steps[0] ||
                'Keep your core engaged and control every repetition with steady breathing.'}
            </p>
          </div>
        </div>

        {/* Row 3: Compact Up Next Strip */}
        <div
          data-testid="flex-up-next"
          class="px-3 py-1.5 rounded-xl bg-slate-900/75 border border-slate-800/80 flex items-center justify-between gap-2 text-xs shrink-0"
        >
          <div class="min-w-0 truncate text-slate-200 font-medium">
            <span class="font-bold uppercase tracking-wider text-[10px] text-slate-500 mr-1.5">
              Up Next
            </span>
            <span>
              {nextStep ? `${nextStep.phase}: ${nextStep.exercise.name}` : 'Finish & Log Session'}
            </span>
          </div>
          <span class="font-mono text-emerald-400 font-bold shrink-0">
            {nextStep ? `${nextStep.duration}s` : 'Done'}
          </span>
        </div>

        {/* Row 4: Oversized Floor Touch Transport Controls */}
        <div
          data-slot="flex-transport"
          data-testid="flex-transport"
          class="flex items-center gap-2 shrink-0"
        >
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous step"
            title="Previous Step (Left Arrow)"
            class="h-13 w-13 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 flex items-center justify-center shrink-0 transition active:scale-95"
          >
            <svg
              class="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.4"
              aria-hidden="true"
            >
              <polygon points="19 20 9 12 19 4 19 20" />
              <line x1="5" y1="19" x2="5" y2="5" />
            </svg>
          </button>

          <button
            type="button"
            onClick={onToggleStartPause}
            title="Start / Pause (Space)"
            class="flex-1 h-13 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition active:scale-[0.98]"
          >
            {isRunning ? (
              <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
            <span>{startButtonLabel}</span>
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={isAtLastStep}
            aria-label="Next step"
            title="Next Step (Right Arrow)"
            class="h-13 w-13 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 flex items-center justify-center shrink-0 transition active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
          >
            <svg
              class="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.4"
              aria-hidden="true"
            >
              <polygon points="5 4 15 12 5 20 5 4" />
              <line x1="19" y1="5" x2="19" y2="19" />
            </svg>
          </button>

          <button
            type="button"
            onClick={onReset}
            aria-label="Reset circuit"
            title="Reset Circuit"
            class="h-13 w-13 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-rose-400 flex items-center justify-center shrink-0 transition active:scale-95"
          >
            <svg
              class="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.4"
              aria-hidden="true"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        </div>
      </section>
    </div>
  );
}
