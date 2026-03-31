let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

function isMuted(): boolean {
  if (typeof window === "undefined") return true;
  const val = localStorage.getItem("hs-sound-muted");
  if (val === null) return false; // Default: sounds ON
  return val === "true";
}

export function setSoundMuted(muted: boolean) {
  localStorage.setItem("hs-sound-muted", String(muted));
}

export function getSoundMuted(): boolean {
  if (typeof window === "undefined") return true;
  const val = localStorage.getItem("hs-sound-muted");
  if (val === null) return false; // Default: sounds ON
  return val === "true";
}

function playTone(
  frequency: number,
  duration: number,
  volume: number = 0.15,
  waveform: OscillatorType = "sine"
) {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = waveform;
  osc.frequency.value = frequency;
  gain.gain.value = volume;
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.stop(ctx.currentTime + duration);
}

export const sounds = {
  /** Warm ascending chime for joining (triangle) */
  join: () => {
    playTone(523, 0.15, 0.15, "triangle");
    setTimeout(() => playTone(659, 0.15, 0.15, "triangle"), 90);
  },
  /** Gentle departure tone (sine) */
  leave: () => {
    playTone(392, 0.25, 0.1, "sine");
  },
  /** Crisp digital blip for message send (square) */
  send: () => {
    playTone(1200, 0.06, 0.08, "square");
  },
  /** Melodic 3-note arpeggio for notifications (triangle) */
  notification: () => {
    playTone(783, 0.1, 0.12, "triangle");
    setTimeout(() => playTone(988, 0.1, 0.12, "triangle"), 80);
    setTimeout(() => playTone(1175, 0.12, 0.12, "triangle"), 160);
  },
  /** Mechanical switch tick for toggles (square) */
  toggle: () => {
    playTone(800, 0.03, 0.06, "square");
  },
  /** Minimal pop for buttons (sine) */
  click: () => {
    playTone(1100, 0.03, 0.06, "sine");
  },
  /** Satisfying rising major arpeggio for correct answer (triangle) */
  correct: () => {
    playTone(523, 0.1, 0.12, "triangle");
    setTimeout(() => playTone(659, 0.1, 0.12, "triangle"), 80);
    setTimeout(() => playTone(784, 0.15, 0.12, "triangle"), 160);
  },
  /** Dissonant descending warning for wrong answer (sawtooth) */
  wrong: () => {
    playTone(466, 0.15, 0.08, "sawtooth");
    setTimeout(() => playTone(349, 0.2, 0.08, "sawtooth"), 100);
  },
  /** Warm welcome chime for login success (triangle, 4 ascending notes) */
  loginSuccess: () => {
    playTone(523, 0.12, 0.12, "triangle");
    setTimeout(() => playTone(659, 0.12, 0.12, "triangle"), 100);
    setTimeout(() => playTone(784, 0.12, 0.12, "triangle"), 200);
    setTimeout(() => playTone(1047, 0.18, 0.15, "triangle"), 300);
  },
};
