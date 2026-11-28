/**
 * Optional Web Speech API voice coaching service.
 * Announces exercise transitions, countdowns, and workout completion with safe fallback.
 */

import type { TimelineStep } from '../domain/schema';

export interface VoiceCoach {
  isSupported: () => boolean;
  setEnabled: (enabled: boolean) => void;
  isEnabled: () => boolean;
  announceStep: (step: TimelineStep) => void;
  announceCountdown: (sec: number) => void;
  announceComplete: () => void;
  testVoice: () => void;
  cancel: () => void;
}

function getSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null;
  if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
    return null;
  }
  return window.speechSynthesis;
}

export function createVoiceCoach(initialEnabled = true): VoiceCoach {
  let enabled = initialEnabled;

  function speak(text: string, rate = 1.04): void {
    if (!enabled) return;
    const synth = getSpeechSynthesis();
    if (!synth) return;

    try {
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = 1;
      utterance.volume = 0.9;
      synth.speak(utterance);
    } catch {
      // Ignore browser speech errors silently so workout timer is never interrupted.
    }
  }

  return {
    isSupported() {
      return getSpeechSynthesis() !== null;
    },
    setEnabled(next: boolean) {
      enabled = next;
      if (!next) {
        this.cancel();
      }
    },
    isEnabled() {
      return enabled;
    },
    announceStep(step: TimelineStep) {
      const isCalmStyle =
        !step.exercise.styles.includes('strength') &&
        (step.exercise.styles.includes('pilates') || step.exercise.styles.includes('mobility'));
      const rate = isCalmStyle ? 0.94 : 1.04;

      if (step.phase === 'WORK') {
        speak(
          isCalmStyle
            ? `${step.exercise.name}. Inhale to prepare, exhale to engage.`
            : `Work. ${step.exercise.name}.`,
          rate,
        );
      } else if (step.phase === 'REST') {
        const cleanName = step.exercise.name.replace(/^Rest & Prep:\s*/i, '');
        speak(
          isCalmStyle ? `Transition. Next: ${cleanName}.` : `Rest. Next up: ${cleanName}.`,
          rate,
        );
      } else if (step.phase === 'WARM-UP') {
        speak('Warm up. Arm circles and mobility.', rate);
      } else {
        speak('Cool down. Breathe deeply and stretch.', 0.94);
      }
    },
    announceCountdown(sec: number) {
      if (sec <= 3 && sec >= 1) {
        speak(String(sec), 1.12);
      }
    },
    announceComplete() {
      speak('Workout complete. Great job!');
    },
    testVoice() {
      const prev = enabled;
      enabled = true;
      speak('Voice coaching ready. Three, two, one, go!');
      enabled = prev;
    },
    cancel() {
      const synth = getSpeechSynthesis();
      if (synth) {
        try {
          synth.cancel();
        } catch {
          // No-op
        }
      }
    },
  };
}
