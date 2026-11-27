import { COOLDOWN_ITEM, DEFAULT_EXERCISES, WARMUP_ITEM } from './defaults';
import type { Exercise, TimelineStep, WorkoutSettings } from './schema';

export const WARMUP_DURATION_SEC = 120;
export const COOLDOWN_DURATION_SEC = 60;

/**
 * Format seconds as MM:SS, clamping negative values to 00:00.
 */
export function formatMMSS(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Compute total duration of a circuit timeline in seconds.
 */
export function computeTotalDuration(timeline: readonly TimelineStep[]): number {
  return timeline.reduce((acc, item) => acc + Math.max(0, item.duration || 0), 0);
}

/**
 * Build the ordered list of WARM-UP, WORK, REST, and COOL-DOWN steps.
 * Pure function with no global state or DOM dependencies.
 */
export function buildCircuitTimeline(
  exercises: readonly Exercise[],
  settings: WorkoutSettings,
): TimelineStep[] {
  const activeExercises = exercises.filter((ex) => ex.active);
  const list: TimelineStep[] = [];

  if (settings.includeWarmup) {
    list.push({
      phase: 'WARM-UP',
      duration: WARMUP_DURATION_SEC,
      round: 0,
      totalRounds: settings.rounds,
      exercise: WARMUP_ITEM,
    });
  }

  for (let r = 1; r <= settings.rounds; r++) {
    activeExercises.forEach((ex, idx) => {
      list.push({
        phase: 'WORK',
        duration: ex.workSecOverride ?? settings.workSec,
        round: r,
        totalRounds: settings.rounds,
        exercise: ex,
      });

      const isLastOfFinalRound = r === settings.rounds && idx === activeExercises.length - 1;

      if (!isLastOfFinalRound) {
        const nextEx =
          idx + 1 < activeExercises.length ? activeExercises[idx + 1]! : activeExercises[0]!;
        const isWeighted =
          nextEx.equipment.kind === 'dumbbells' || nextEx.equipment.kind === 'kettlebell';

        list.push({
          phase: 'REST',
          duration: settings.restSec,
          round: r,
          totalRounds: settings.rounds,
          exercise: {
            id: `rest-before-${nextEx.id}-r${r}-${idx}`,
            name: `Rest & Prep: ${nextEx.name}`,
            muscleGroup: `Next: ${nextEx.muscleGroup}`,
            muscleGroups: [...nextEx.muscleGroups],
            durations: [...nextEx.durations],
            requiredEquipment: [...nextEx.requiredEquipment],
            styles: [...nextEx.styles],
            equipment: nextEx.equipment,
            animationType: nextEx.animationType,
            active: true,
            steps: [
              isWeighted
                ? 'Set your weights down safely and shake out your forearms and shoulders.'
                : 'Shake out your arms and shoulders and catch your breath.',
              `Preview the form guide for ${nextEx.name}.`,
              isWeighted
                ? 'Take 3 deep breaths and pick up your weights on the 3-2-1 countdown.'
                : 'Take 3 deep breaths and get into position on the 3-2-1 countdown.',
            ],
            tip: nextEx.tip || 'Stay loose and keep your posture tall during rest.',
          },
        });
      }
    });
  }

  if (settings.includeCooldown) {
    list.push({
      phase: 'COOL-DOWN',
      duration: COOLDOWN_DURATION_SEC,
      round: settings.rounds,
      totalRounds: settings.rounds,
      exercise: COOLDOWN_ITEM,
    });
  }

  if (list.length === 0) {
    const fallbackEx = DEFAULT_EXERCISES[0]!;
    list.push({
      phase: 'WORK',
      duration: settings.workSec || 40,
      round: 1,
      totalRounds: 1,
      exercise: fallbackEx,
    });
  }

  return list;
}
