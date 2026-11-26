import type { TimelinePhase, TimelineStep } from '../domain/schema';
import { formatMMSS } from '../domain/timeline';
import type { TimerSnapshot } from '../engine/timer';

export interface HeaderBarProps {
  currentStep: TimelineStep;
  totalSteps: number;
  totalDurationSec: number;
  timer: TimerSnapshot;
  soundEnabled: boolean;
  voiceEnabled: boolean;
  voiceSupported: boolean;
  onToggleStartPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
  onToggleSound: () => void;
  onToggleVoice: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
}

const PHASE_BADGE_STYLES: Record<TimelinePhase, { badge: string; stroke: string; label: string }> =
  {
    'WARM-UP': {
      badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      stroke: '#fbbf24',
      label: 'WARM-UP',
    },
    WORK: {
      badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      stroke: '#10b981',
      label: 'WORK',
    },
    REST: {
      badge: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
      stroke: '#38bdf8',
      label: 'REST',
    },
    'COOL-DOWN': {
      badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      stroke: '#c084fc',
      label: 'COOL-DOWN',
    },
  };

const RING_CIRCUMFERENCE = 87.96;

export function HeaderBar({
  currentStep,
  totalSteps,
  totalDurationSec,
  timer,
  soundEnabled,
  voiceEnabled,
  voiceSupported,
  onToggleStartPause,
  onPrev,
  onNext,
  onReset,
  onToggleSound,
  onToggleVoice,
  onOpenSettings,
  onOpenHistory,
}: HeaderBarProps) {
  const isCompleted = timer.status === 'completed';
  const isRunning = timer.status === 'running';
  const isAtLastStep = timer.currentIndex >= totalSteps - 1;

  const phaseStyle = isCompleted
    ? {
        badge: 'bg-emerald-500 text-slate-950 border-emerald-400',
        stroke: '#10b981',
        label: 'DONE!',
      }
    : PHASE_BADGE_STYLES[currentStep.phase];

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
    <header class="sticky top-0 z-30 w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
      <div class="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2 sm:gap-2.5">
        {/* Left: App Brand & Local Storage Indicator */}
        <div class="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
            <svg
              class="w-4 h-4 sm:w-5 sm:h-5 text-slate-950"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M6.5 6.5h11M6.5 17.5h11M3 10v4M21 10v4M6.5 4v16M17.5 4v16" />
            </svg>
          </div>
          <div class="leading-tight min-w-0">
            <div class="flex items-center gap-1.5 sm:gap-2">
              <h1 class="font-bold text-sm sm:text-base tracking-tight text-white truncate">
                Circuit Studio
              </h1>
              <button
                type="button"
                onClick={onOpenHistory}
                title="Offline Ready — view workout history and local storage details"
                aria-label="Offline ready, open workout history"
                class="inline-flex items-center gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition shrink-0"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                <span class="hidden sm:inline">Offline Ready</span>
              </button>
            </div>
            <p class="text-[11px] text-slate-400 hidden sm:block">
              Dumbbell Form Guide • Wall-Clock Interval Trainer
            </p>
          </div>
        </div>

        {/* Center: Responsive Timer & Transport Pill (2-row stacked on narrow phones, 1-row on sm+) */}
        <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-inner order-3 lg:order-2 w-full lg:w-auto sm:justify-between lg:justify-center min-w-0">
          {/* Status + Digital Clock Row */}
          <div class="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 min-w-0">
            <div class="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <span
                data-testid="phase-badge"
                class={`px-2 sm:px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider border shrink-0 ${phaseStyle.badge}`}
              >
                {phaseStyle.label}
              </span>
              <span class="text-xs font-medium text-slate-400 truncate">
                {currentStep.round === 0
                  ? 'Prep'
                  : `Round ${currentStep.round}/${currentStep.totalRounds}`}
              </span>
            </div>

            <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <svg class="w-5 h-5 -rotate-90 shrink-0" viewBox="0 0 36 36" aria-hidden="true">
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
                class="font-mono text-xl sm:text-2xl font-bold tracking-tight text-white tabular-nums"
              >
                {formatMMSS(timer.remainingSec)}
              </span>
              <span data-testid="step-counter" class="text-[11px] font-mono text-slate-500">
                {timer.currentIndex + 1}/{totalSteps}
              </span>
            </div>
          </div>

          {/* Transport Controls Row */}
          <div class="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-1">
            <button
              type="button"
              onClick={onPrev}
              aria-label="Previous step"
              title="Previous Step (Left Arrow)"
              class="p-2 rounded-xl bg-slate-950/60 sm:bg-transparent hover:bg-slate-800 text-slate-300 sm:text-slate-400 hover:text-white transition active:scale-95 shrink-0"
            >
              <svg
                class="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
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
              class="flex-1 sm:flex-none justify-center px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-emerald-500/20 transition active:scale-95"
            >
              {isRunning ? (
                <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
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
              class="p-2 rounded-xl bg-slate-950/60 sm:bg-transparent hover:bg-slate-800 text-slate-300 sm:text-slate-400 hover:text-white transition active:scale-95 disabled:opacity-30 disabled:pointer-events-none shrink-0"
            >
              <svg
                class="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
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
              class="p-2 rounded-xl bg-slate-950/60 sm:bg-transparent hover:bg-slate-800 text-slate-300 sm:text-slate-400 hover:text-rose-400 transition active:scale-95 shrink-0"
            >
              <svg
                class="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                aria-hidden="true"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right: Audio, Voice, Settings, History */}
        <div class="flex items-center gap-1 sm:gap-2 order-2 lg:order-3 shrink-0">
          <span class="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono font-medium bg-slate-900 border border-slate-800 text-slate-300">
            {formatMMSS(totalDurationSec)} Total
          </span>

          <button
            type="button"
            onClick={onToggleSound}
            aria-label={soundEnabled ? 'Mute interval beeps' : 'Enable interval beeps'}
            aria-pressed={soundEnabled}
            title="Toggle Interval Beeps (M)"
            class="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 transition"
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
              class="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 transition"
            >
              <svg
                class={`w-4 h-4 ${voiceEnabled ? 'text-sky-400' : 'text-slate-500'}`}
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
            onClick={onOpenSettings}
            aria-label="Open timer settings"
            title="Timer & Audio Settings"
            class="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition"
          >
            <svg
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={onOpenHistory}
            aria-label="Open workout history"
            class="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition"
          >
            <svg
              class="w-4 h-4 text-emerald-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span class="hidden sm:inline">History</span>
          </button>
        </div>
      </div>

      {/* Overall Circuit Progress Bar */}
      <div class="w-full h-1 bg-slate-900">
        <div
          class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
          style={{ width: `${overallPct}%` }}
        />
      </div>
    </header>
  );
}
