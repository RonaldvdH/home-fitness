/**
 * Shared workout phase visual tokens, spotlight classes, and timer ring math
 * consumed by HeaderBar, WorkoutStage, and FlexWorkoutView.
 */

import type { TimelinePhase } from '../domain/schema';
import type { TimerStatus } from '../engine/timer';

export interface PhaseStyle {
  badge: string;
  stroke: string;
  label: string;
}

export const RING_CIRCUMFERENCE = 87.96;

const DEFAULT_PHASE_STYLES: Record<TimelinePhase, PhaseStyle> = {
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

const FLEX_PHASE_STYLES: Record<TimelinePhase, PhaseStyle> = {
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

const COMPLETED_PHASE_STYLE: PhaseStyle = {
  badge: 'bg-emerald-500 text-slate-950 border-emerald-400',
  stroke: '#10b981',
  label: 'DONE!',
};

export const STAGE_SPOTLIGHT_MAP: Record<TimelinePhase, string> = {
  'WARM-UP': 'stage-spotlight-warmup',
  WORK: 'stage-spotlight',
  REST: 'stage-spotlight-rest',
  'COOL-DOWN': 'stage-spotlight',
};

export function resolvePhaseStyle(
  phase: TimelinePhase,
  isCompleted: boolean,
  variant: 'default' | 'flex' = 'default',
): PhaseStyle {
  if (isCompleted) return COMPLETED_PHASE_STYLE;
  return variant === 'flex' ? FLEX_PHASE_STYLES[phase] : DEFAULT_PHASE_STYLES[phase];
}

export function resolveSpotlightClass(
  phase: TimelinePhase,
  isPreview: boolean,
  isCompleted: boolean,
): string {
  if (isPreview) return 'stage-spotlight-preview';
  if (isCompleted) return 'stage-spotlight';
  return STAGE_SPOTLIGHT_MAP[phase];
}

export function resolveStartButtonLabel(status: TimerStatus): string {
  if (status === 'running') return 'Pause';
  if (status === 'completed') return 'Restart';
  if (status === 'idle') return 'Start';
  return 'Resume';
}

export function computeTimerProgress(
  remainingMs: number,
  stepDurationSec: number,
  currentIndex: number,
  totalSteps: number,
  isCompleted: boolean,
): { strokeDashoffset: number; overallPct: number } {
  const stepDurationMs = Math.max(1, stepDurationSec * 1000);
  const ratio = isCompleted ? 0 : Math.max(0, Math.min(1, remainingMs / stepDurationMs));
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - ratio);
  const overallPct = isCompleted
    ? 100
    : Math.round(((currentIndex + (1 - ratio)) / Math.max(1, totalSteps)) * 100);
  return { strokeDashoffset, overallPct };
}
