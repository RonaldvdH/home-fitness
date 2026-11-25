/**
 * Web Audio API synthesizer for interval cues and countdown beeps.
 */
export const AUDIO_ENGINE = {
  ctx: null,
  muted: false,

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  playTone(freq, duration = 0.14, type = 'sine', delay = 0, volume = 0.24) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  },

  beepCountdown() {
    this.playTone(540, 0.11, 'triangle', 0, 0.2);
  },

  beepWorkStart() {
    this.playTone(880, 0.24, 'sine', 0, 0.3);
    this.playTone(1174.66, 0.2, 'sine', 0.11, 0.24);
  },

  beepRestStart() {
    this.playTone(440, 0.16, 'sine', 0, 0.22);
    this.playTone(349.23, 0.24, 'sine', 0.15, 0.22);
  },

  beepComplete() {
    this.playTone(523.25, 0.15, 'triangle', 0, 0.25);
    this.playTone(659.25, 0.15, 'triangle', 0.13, 0.25);
    this.playTone(783.99, 0.15, 'triangle', 0.26, 0.25);
    this.playTone(1046.5, 0.42, 'triangle', 0.39, 0.32);
  },
};
