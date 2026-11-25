import { COOLDOWN_ITEM, DEFAULT_EXERCISES, WARMUP_ITEM } from '../data/exercises.js';

/**
 * Format seconds as MM:SS.
 * @param {number} sec
 * @returns {string}
 */
export function formatMMSS(sec) {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Compute total duration of a circuit timeline in seconds.
 * @param {Array<{ duration: number }>} timeline
 * @returns {number}
 */
export function computeTotalDuration(timeline) {
  return timeline.reduce((acc, item) => acc + (item.duration || 0), 0);
}

/**
 * Build the ordered list of WARM-UP, WORK, REST, and COOL-DOWN steps.
 * Pure function with no global state or DOM dependencies.
 *
 * @param {Array} exercises
 * @param {object} settings
 * @returns {Array}
 */
export function buildCircuitTimeline(exercises, settings) {
  const activeExercises = exercises.filter((ex) => ex.active);
  const list = [];

  if (settings.includeWarmup) {
    list.push({
      phase: 'WARM-UP',
      duration: 120,
      round: 0,
      totalRounds: settings.rounds,
      exercise: WARMUP_ITEM,
    });
  }

  for (let r = 1; r <= settings.rounds; r++) {
    activeExercises.forEach((ex, idx) => {
      list.push({
        phase: 'WORK',
        duration: settings.workSec,
        round: r,
        totalRounds: settings.rounds,
        exercise: ex,
      });

      const isLastOfFinalRound = r === settings.rounds && idx === activeExercises.length - 1;

      if (!isLastOfFinalRound) {
        const nextEx = idx + 1 < activeExercises.length ? activeExercises[idx + 1] : activeExercises[0];
        list.push({
          phase: 'REST',
          duration: settings.restSec,
          round: r,
          totalRounds: settings.rounds,
          exercise: {
            id: 'rest-phase',
            name: `Rest & Prep: ${nextEx.name}`,
            muscleGroup: `Next: ${nextEx.muscleGroup}`,
            equipment: nextEx.equipment || '2x 5kg Dumbbells',
            animationType: nextEx.animationType,
            steps: [
              'Set the 5kg dumbbells down safely and shake out your forearms and shoulders.',
              `Preview the smooth animation on the left for ${nextEx.name}.`,
              'Take 3 deep breaths and pick up your weights on the 3-2-1 countdown.',
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
      duration: 60,
      round: settings.rounds,
      totalRounds: settings.rounds,
      exercise: COOLDOWN_ITEM,
    });
  }

  if (list.length === 0) {
    list.push({
      phase: 'WORK',
      duration: 40,
      round: 1,
      totalRounds: 1,
      exercise: DEFAULT_EXERCISES[0],
    });
  }

  return list;
}
