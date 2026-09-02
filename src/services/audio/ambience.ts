import type { AmbienceName } from '../../constants/listening';

/**
 * The room a Native Listening clip is played in.
 *
 * Synthesised rather than recorded, and that is a constraint rather than a
 * preference: the app ships no ambience assets, the clip pipeline generates one
 * deck of speech a day against a metered key, and a room tone bundled as audio
 * would be several megabytes of payload for something a filter can make in a
 * millisecond. So this is filtered noise with a slow gain wobble — near enough
 * to a room with people in it that studio-perfect speech stops being the only
 * thing she can follow, which is the whole and entire objective.
 *
 * It is emphatically *not* trying to make the exercise hard. The gains below are
 * a long way under the speech, the fade in and out are there so the bed never
 * starts with a click, and the spec's own line is the rule this file is written
 * to: the challenge comes from realistic speech, never from poor audio.
 *
 * Everything here fails silent. A browser with no Web Audio, a context the
 * autoplay policy will not start, an engine that throws on a filter type — all
 * of them leave the learner with clean speech and no error, because the speech
 * is the exercise and the room is the trimming.
 */

/**
 * How loud each room is, and what shape its noise has.
 *
 * `gain` is a peak amplitude against speech at full scale, so these are all
 * roughly twenty to thirty decibels down. `cutoff` is a low-pass corner in
 * hertz — the lower it is, the more the bed sits under the voice rather than
 * across it, which is what keeps consonants intelligible.
 */
const ROOMS: Record<AmbienceName, { gain: number; cutoff: number; wobble: number }> = {
  // A quiet room with somebody else in it: mostly low rumble, barely there.
  room: { gain: 0.035, cutoff: 700, wobble: 0.08 },
  // A café: brighter, because crockery and voices carry higher, and busier.
  cafe: { gain: 0.055, cutoff: 1600, wobble: 0.25 },
  // A street: louder and lower — traffic is nearly all bottom end.
  street: { gain: 0.07, cutoff: 500, wobble: 0.35 },
};

/** How long the bed takes to arrive and to leave, in seconds. */
const FADE = 0.6;

/** Seconds of noise generated and looped. Long enough not to hear the seam. */
const BUFFER_SECONDS = 4;

type Bed = { stop: () => void };

let context: AudioContext | null = null;
let playing: Bed | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!context) {
    try {
      context = new Ctor();
    } catch {
      return null;
    }
  }
  return context;
}

/**
 * Pink-ish noise: white noise run through a one-pole filter.
 *
 * White noise on its own is a hiss and sounds like a fault. Rolling the top off
 * it is what turns it into a room, and doing it in the buffer rather than only
 * in the filter node means even the brightest of the three rooms has no
 * tape-hiss quality to it.
 */
function noiseBuffer(ctx: AudioContext): AudioBuffer {
  const frames = Math.floor(ctx.sampleRate * BUFFER_SECONDS);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  let last = 0;
  for (let at = 0; at < frames; at++) {
    const white = Math.random() * 2 - 1;
    last = 0.98 * last + 0.02 * white;
    data[at] = last * 3.2;
  }

  return buffer;
}

/**
 * Starts a room under whatever is about to be spoken.
 *
 * Returns a stopper rather than relying on the caller to name the room again,
 * so a screen that unmounts mid-clip cannot leave a bed running behind the next
 * one. Starting a second bed stops the first for the same reason — one room at
 * a time, always.
 */
export function startAmbience(name: AmbienceName): () => void {
  stopAmbience();

  const ctx = audioContext();
  if (!ctx) return () => {};

  const room = ROOMS[name];
  let source: AudioBufferSourceNode;
  let gain: GainNode;

  try {
    // A suspended context is the normal state before the page's first gesture.
    // Resuming is best-effort: if the policy refuses, the noise simply never
    // sounds and the speech plays clean.
    void ctx.resume?.();

    source = ctx.createBufferSource();
    source.buffer = noiseBuffer(ctx);
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = room.cutoff;

    gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(room.gain, ctx.currentTime + FADE);

    // The slow wobble is what stops it reading as a machine: a room is never at
    // one level, and a constant hiss is the thing people describe as "static".
    const wobble = ctx.createOscillator();
    wobble.frequency.value = 0.12;
    const wobbleDepth = ctx.createGain();
    wobbleDepth.gain.value = room.gain * room.wobble;
    wobble.connect(wobbleDepth).connect(gain.gain);
    wobble.start();

    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();

    const bed: Bed = {
      stop: () => {
        try {
          gain.gain.cancelScheduledValues(ctx.currentTime);
          gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + FADE);
          // Stopped after the fade rather than with it, so the bed is never cut
          // off with a click.
          source.stop(ctx.currentTime + FADE + 0.05);
          wobble.stop(ctx.currentTime + FADE + 0.05);
        } catch {
          // Already stopped, or a context torn down under us. Nothing to undo.
        }
      },
    };

    playing = bed;
    return () => {
      if (playing === bed) playing = null;
      bed.stop();
    };
  } catch {
    return () => {};
  }
}

/** Stops whatever room is running, if any. */
export function stopAmbience(): void {
  const bed = playing;
  playing = null;
  bed?.stop();
}

/** What the room is called on screen, so the learner knows what she is hearing. */
export const AMBIENCE_LABELS: Record<AmbienceName, string> = {
  room: 'a quiet room',
  cafe: 'a café',
  street: 'a street',
};
