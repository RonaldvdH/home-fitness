import { APP_STATE } from '../state/store.js';
import { AUDIO_ENGINE } from '../services/audio.js';
import { computeTotalDuration } from './timeline.js';

/**
 * Create a timer controller wired to UI render and persistence callbacks.
 */
export function createTimerController({ onTick, onTransportChange, onComplete, onPersist }) {
  function startTimer() {
    if (APP_STATE.isRunning) return;
    AUDIO_ENGINE.init();

    const currentStep = APP_STATE.timeline[APP_STATE.currentIndex];
    if (currentStep && APP_STATE.remainingSec === currentStep.duration) {
      if (currentStep.phase === 'WORK') AUDIO_ENGINE.beepWorkStart();
      else AUDIO_ENGINE.beepCountdown();
    }

    APP_STATE.isRunning = true;
    onTransportChange?.();

    APP_STATE.intervalId = setInterval(() => {
      if (APP_STATE.remainingSec > 1) {
        APP_STATE.remainingSec -= 1;
        if (APP_STATE.remainingSec <= 3 && APP_STATE.remainingSec >= 1) {
          AUDIO_ENGINE.beepCountdown();
        }
        onTick?.(false);
      } else {
        advanceTimeline(1, true);
      }
    }, 1000);
  }

  function pauseTimer() {
    APP_STATE.isRunning = false;
    if (APP_STATE.intervalId) {
      clearInterval(APP_STATE.intervalId);
      APP_STATE.intervalId = null;
    }
    onTransportChange?.();
  }

  function resetTimer() {
    pauseTimer();
    APP_STATE.currentIndex = 0;
    APP_STATE.remainingSec = APP_STATE.timeline[0]?.duration ?? 0;
    onTick?.(false);
  }

  function logWorkoutSession() {
    const totalSec = computeTotalDuration(APP_STATE.timeline);
    const entry = {
      id: `sess-${Date.now()}`,
      date: new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      rounds: APP_STATE.settings.rounds,
      durationMin: Math.max(1, Math.round(totalSec / 60)),
      exerciseCount: APP_STATE.exercises.filter((e) => e.active).length,
    };
    APP_STATE.history.unshift(entry);
    if (APP_STATE.history.length > 30) APP_STATE.history.pop();
    onPersist?.();
  }

  function advanceTimeline(delta, autoTriggered = false) {
    const nextIdx = APP_STATE.currentIndex + delta;

    if (nextIdx < 0) {
      APP_STATE.currentIndex = 0;
      APP_STATE.remainingSec = APP_STATE.timeline[0]?.duration ?? 0;
      onTick?.(false);
      return;
    }

    if (nextIdx >= APP_STATE.timeline.length) {
      pauseTimer();
      APP_STATE.remainingSec = 0;
      AUDIO_ENGINE.beepComplete();
      logWorkoutSession();
      onComplete?.();
      onTick?.(true);
      return;
    }

    APP_STATE.currentIndex = nextIdx;
    APP_STATE.remainingSec = APP_STATE.timeline[nextIdx].duration;

    const phase = APP_STATE.timeline[nextIdx].phase;
    if (autoTriggered || APP_STATE.isRunning) {
      if (phase === 'WORK') AUDIO_ENGINE.beepWorkStart();
      else if (phase === 'REST') AUDIO_ENGINE.beepRestStart();
      else AUDIO_ENGINE.beepCountdown();
    }

    onTick?.(false);
  }

  return {
    startTimer,
    pauseTimer,
    resetTimer,
    advanceTimeline,
    logWorkoutSession,
  };
}
