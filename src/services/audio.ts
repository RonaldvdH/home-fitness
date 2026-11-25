/**
 * Web Audio API synthesizer for interval cues and countdown beeps.
 */

type AudioContextConstructor = typeof AudioContext;

export interface AudioCoach {
  setEnabled: (enabled: boolean) => void;
  isEnabled: () => boolean;
  unlock: () => void;
  beepCountdown: () => void;
  beepWorkStart: () => void;
  beepRestStart: () => void;
  beepComplete: () => void;
}

export function createAudioCoach(initialEnabled = true): AudioCoach {
  let ctx: AudioContext | null = null;
  let enabled = initialEnabled;

  function ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!ctx) {
      const win = window as Window & { webkitAudioContext?: AudioContextConstructor };
      const AudioCtx = window.AudioContext ?? win.webkitAudioContext;
      if (AudioCtx) {
        ctx = new AudioCtx();
      }
    }
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function playTone(
    freq: number,
    duration = 0.14,
    type: OscillatorType = 'sine',
    delay = 0,
    volume = 0.24,
  ): void {
    if (!enabled) return;
    const audioCtx = ensureContext();
    if (!audioCtx) return;

    const now = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  return {
    setEnabled(next: boolean) {
      enabled = next;
    },
    isEnabled() {
      return enabled;
    },
    unlock() {
      if (enabled) ensureContext();
    },
    beepCountdown() {
      playTone(540, 0.11, 'triangle', 0, 0.2);
    },
    beepWorkStart() {
      playTone(880, 0.24, 'sine', 0, 0.3);
      playTone(1174.66, 0.2, 'sine', 0.11, 0.24);
    },
    beepRestStart() {
      playTone(440, 0.16, 'sine', 0, 0.22);
      playTone(349.23, 0.24, 'sine', 0.15, 0.22);
    },
    beepComplete() {
      playTone(523.25, 0.15, 'triangle', 0, 0.25);
      playTone(659.25, 0.15, 'triangle', 0.13, 0.25);
      playTone(783.99, 0.15, 'triangle', 0.26, 0.25);
      playTone(1046.5, 0.42, 'triangle', 0.39, 0.32);
    },
  };
}
