/**
 * NEXORA FX — Audio Alerts & AI Voice Synthesizer
 * Uses Web Audio API for synthetic chimes and Web Speech API for voice announcements.
 * 100% resilient for iOS Safari, WebKit, and mobile in-app browsers.
 */

let audioCtx = null;

const safeStorage = {
  getItem: (key) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      // SecurityError on iOS private/in-app WebKit
    }
    return null;
  },
  setItem: (key, val) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, val);
      }
    } catch (e) {
      // Ignore storage restrictions
    }
  }
};

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  } catch (e) {
    return null;
  }
  return audioCtx;
}

export const audioAlerts = {
  isEnabled: () => {
    const saved = safeStorage.getItem('nexora_sound_alerts');
    return saved === null ? true : saved === 'true';
  },

  setEnabled: (val) => {
    safeStorage.setItem('nexora_sound_alerts', val ? 'true' : 'false');
    if (val) {
      audioAlerts.playPing();
    }
  },

  toggle: () => {
    const next = !audioAlerts.isEnabled();
    audioAlerts.setEnabled(next);
    return next;
  },

  // Play a sleek notification ping
  playPing: () => {
    if (!audioAlerts.isEnabled()) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  },

  // Play Buy Signal Chime (Pleasant ascending major chord)
  playBuySound: () => {
    if (!audioAlerts.isEnabled()) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);

        gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.06);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + idx * 0.06 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.06 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.06);
        osc.stop(ctx.currentTime + idx * 0.06 + 0.35);
      });
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  },

  // Play Sell Signal Chime (Alert laser descending pulse)
  playSellSound: () => {
    if (!audioAlerts.isEnabled()) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const notes = [880, 698.46, 587.33, 440];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);

        gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.07);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + idx * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.07);
        osc.stop(ctx.currentTime + idx * 0.07 + 0.28);
      });
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  },

  // Play Cash / Profit Close Chime (Double Ding)
  playCashChime: () => {
    if (!audioAlerts.isEnabled()) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      [1318.51, 1760].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);

        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.45);
      });
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  },

  // AI Voice Announcement using browser speech synthesis
  speak: (text) => {
    if (!audioAlerts.isEnabled()) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 0.85;

      const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
      if (voices && voices.length > 0) {
        const preferredVoice = voices.find(v => v.lang && v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha')));
        if (preferredVoice) utterance.voice = preferredVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  },

  // Voice announcement helper for sniper signals
  speakSignal: (symbol, direction, confidence, entryPrice) => {
    const cleanSym = symbol ? symbol.replace('USD', ' dollar').replace('USDT', '') : 'Instrument';
    const text = `NEXORA Signal. ${cleanSym}. ${direction} recommended with ${confidence || 80} percent confidence.`;
    audioAlerts.speak(text);
  }
};
