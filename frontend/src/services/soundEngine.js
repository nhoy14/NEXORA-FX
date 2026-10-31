/**
 * Web Audio Synthesizer for Institutional Audio Chimes
 * No external mp3 files needed; uses native HTML5 Web Audio API.
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playBuySignal() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    // Ascending chime: C5 -> E5 -> G5
    osc.frequency.setValueAtTime(523.25, t);
    osc.frequency.exponentialRampToValueAtTime(659.25, t + 0.08);
    osc.frequency.exponentialRampToValueAtTime(783.99, t + 0.16);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.46);
  }

  playSellSignal() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    // Descending alert: G4 -> E4 -> C4
    osc.frequency.setValueAtTime(392.00, t);
    osc.frequency.exponentialRampToValueAtTime(329.63, t + 0.08);
    osc.frequency.exponentialRampToValueAtTime(261.63, t + 0.18);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.2, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.41);
  }

  playAlertTrigger() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Bell chime: 880Hz (A5) with bell ping
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(1760, t + 0.05);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.15);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.81);
  }
}

export const soundEngine = new SoundEngine();

