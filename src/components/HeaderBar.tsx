import type { TimelineStep } from '../domain/schema';
import { formatMMSS } from '../domain/timeline';
import type { TimerSnapshot } from '../engine/timer';
import {
  DumbbellBrandIcon,
  FloorModeIcon,
  HistoryClockIcon,
  NextStepIcon,
  PauseIcon,
  PlayIcon,
  PrevStepIcon,
  ResetIcon,
  SettingsGearIcon,
  SoundOffIcon,
  SoundOnIcon,
  VoiceMicIcon,
} from './icons';
import {
  computeTimerProgress,
  resolvePhaseStyle,
  resolveStartButtonLabel,
  RING_CIRCUMFERENCE,
} from './phaseTheme';

export interface HeaderBarProps {
  currentStep: TimelineStep;
  totalSteps: number;
  totalDurationSec: number;
  timer: TimerSnapshot;
  soundEnabled: boolean;
  voiceEnabled: boolean;
  voiceSupported: boolean;
  floorModeActive: boolean;
  onToggleStartPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
  onToggleSound: () => void;
  onToggleVoice: () => void;
  onToggleFloorMode: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
}

export function HeaderBar({
  currentStep,
  totalSteps,
  totalDurationSec,
  timer,
  soundEnabled,
  voiceEnabled,
  voiceSupported,
  floorModeActive,
  onToggleStartPause,
  onPrev,
  onNext,
  onReset,
  onToggleSound,
  onToggleVoice,
  onToggleFloorMode,
  onOpenSettings,
  onOpenHistory,
}: HeaderBarProps) {
  const isCompleted = timer.status === 'completed';
  const isRunning = timer.status === 'running';
  const isAtLastStep = timer.currentIndex >= totalSteps - 1;

  const phaseStyle = resolvePhaseStyle(currentStep.phase, isCompleted, 'default');
  const { strokeDashoffset, overallPct } = computeTimerProgress(
    timer.remainingMs,
    currentStep.duration,
    timer.currentIndex,
    totalSteps,
    isCompleted,
  );
  const startButtonLabel = resolveStartButtonLabel(timer.status);

  return (
    <header class="sticky top-0 z-30 w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
      <div class="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2 sm:gap-2.5">
        {/* Left: App Brand & Local Storage Indicator */}
        <div class="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <div class="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
            <DumbbellBrandIcon class="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
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

        {/* Center: Responsive Timer & Transport Pill */}
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
              <PrevStepIcon class="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onToggleStartPause}
              title="Start / Pause (Space)"
              class="flex-1 sm:flex-none justify-center px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-emerald-500/20 transition active:scale-95"
            >
              {isRunning ? (
                <PauseIcon class="w-3.5 h-3.5 fill-current" />
              ) : (
                <PlayIcon class="w-3.5 h-3.5 fill-current" />
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
              <NextStepIcon class="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onReset}
              aria-label="Reset circuit"
              title="Reset Circuit"
              class="p-2 rounded-xl bg-slate-950/60 sm:bg-transparent hover:bg-slate-800 text-slate-300 sm:text-slate-400 hover:text-rose-400 transition active:scale-95 shrink-0"
            >
              <ResetIcon class="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Floor Mode, Audio, Voice, Settings, History */}
        <div class="flex items-center gap-1 sm:gap-1.5 order-2 lg:order-3 shrink-0">
          <span class="hidden 2xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono font-medium bg-slate-900 border border-slate-800 text-slate-300">
            {formatMMSS(totalDurationSec)} Total
          </span>

          <button
            type="button"
            onClick={onToggleFloorMode}
            aria-label={floorModeActive ? 'Exit Floor Mode' : 'Enter Floor Mode'}
            aria-pressed={floorModeActive}
            title="Flip-Phone Floor Mode (F)"
            class={`p-1.5 sm:px-2.5 sm:py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 ${
              floorModeActive
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
            }`}
          >
            <FloorModeIcon class="w-4 h-4 text-emerald-400" />
            <span class="hidden sm:inline">Floor</span>
          </button>

          <button
            type="button"
            onClick={onToggleSound}
            aria-label={soundEnabled ? 'Mute interval beeps' : 'Enable interval beeps'}
            aria-pressed={soundEnabled}
            title="Toggle Interval Beeps (M)"
            class="p-1.5 sm:p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 transition"
          >
            {soundEnabled ? <SoundOnIcon /> : <SoundOffIcon />}
          </button>

          {voiceSupported && (
            <button
              type="button"
              onClick={onToggleVoice}
              aria-label={voiceEnabled ? 'Mute voice coaching' : 'Enable voice coaching'}
              aria-pressed={voiceEnabled}
              title="Toggle Voice Announcements (V)"
              class="p-1.5 sm:p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 transition"
            >
              <VoiceMicIcon class={`w-4 h-4 ${voiceEnabled ? 'text-sky-400' : 'text-slate-500'}`} />
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Open settings"
            title="Settings (Timer, Spaces & Backup)"
            class="p-1.5 sm:p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition"
          >
            <SettingsGearIcon />
          </button>

          <button
            type="button"
            onClick={onOpenHistory}
            aria-label="Open workout history"
            class="p-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition"
          >
            <HistoryClockIcon />
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
