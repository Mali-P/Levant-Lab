export type FeedbackEvent =
  | 'accept'
  | 'reject'
  | 'run-failed'
  | 'perfect-run'
  | 'deck-mastered';

export type FeedbackSettings = { soundEffects: boolean; haptics: boolean };

/** Vibration patterns, in milliseconds. */
const HAPTICS: Record<FeedbackEvent, number | number[]> = {
  accept: 12,
  reject: [0, 40, 60, 40],
  'run-failed': [0, 120, 80, 220],
  'perfect-run': [0, 30, 40, 30, 40, 60],
  'deck-mastered': [0, 40, 50, 40, 50, 120],
};

/** Simple two-tone cues, synthesised so the app ships with no audio assets. */
const TONES: Record<FeedbackEvent, { freq: number[]; duration: number }> = {
  accept: { freq: [660, 880], duration: 0.09 },
  reject: { freq: [220, 180], duration: 0.16 },
  'run-failed': { freq: [200, 150, 110], duration: 0.2 },
  'perfect-run': { freq: [523, 659, 784], duration: 0.12 },
  'deck-mastered': { freq: [523, 659, 784, 1047], duration: 0.14 },
};

let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!context) context = new Ctor();
  return context;
}

function playTone(event: FeedbackEvent): void {
  const ctx = audioContext();
  if (!ctx) return;
  // Browsers suspend audio until a gesture; study taps count as one.
  if (ctx.state === 'suspended') void ctx.resume();

  const { freq, duration } = TONES[event];
  let start = ctx.currentTime;

  for (const f of freq) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.14, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration);
    start += duration * 0.85;
  }
}

function vibrate(event: FeedbackEvent): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  navigator.vibrate(HAPTICS[event]);
}

/**
 * Sound and haptics are decoration only. Every result is also stated in text
 * and icons on screen, so nothing is lost when both are switched off.
 */
export function fireFeedback(
  event: FeedbackEvent,
  settings: FeedbackSettings,
): void {
  try {
    if (settings.soundEffects) playTone(event);
    if (settings.haptics) vibrate(event);
  } catch {
    // Feedback must never interrupt a study session.
  }
}
