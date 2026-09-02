import { useCallback, useEffect, useRef, useState } from 'react';
import type { Language, Settings, SpeechPerspective } from '../types';
import type { HeardTurn, ListeningPace, AmbienceName } from '../constants/listening';
import { speechService } from '../services/speech';
import { resolveTtsPlan } from '../services/audio/ttsPlan';
import { clipUrl } from '../services/audio/manifest';
import { playPronunciation, stopPronunciation } from '../services/audio/pronunciation';
import { startAmbience, stopAmbience } from '../services/audio/ambience';
import { wordForms } from '../utils/wordForms';
import { useSettings } from '../stores/settingsStore';

/**
 * Playing what a Native Listening item is heard as.
 *
 * Everything below is one language and one utterance at a time. An exchange is
 * played as its turns in order with a beat between them, and the beat is real
 * silence rather than a crossfade, because the pause between two speakers is
 * itself something a learner has to get used to hearing.
 *
 * This is not `usePronunciation`. That hook plays one *word* at the learner's
 * standing speech rate and is right everywhere else in the app; this one plays a
 * whole line, at a speed the exercise chooses rather than the learner, with a
 * room behind it. The pronunciation ladder underneath is the same — a bundled
 * clip, then the card's override, then the Palestinian dictionary, then the
 * spelling — so nothing here says a word differently from the rest of the app.
 */

/**
 * What each way of playing does to the learner's own speech rate.
 *
 * Multipliers rather than absolute rates, so a learner who has slowed the whole
 * app down keeps her setting and still gets the *contrast* this level runs on:
 * whatever "normal" means to her, natural is faster than careful and the slow
 * replay is slower than both.
 *
 * `natural` is only a little above her rate on purpose. Ordinary Levantine
 * speech is not fast so much as *joined*, and the thing that makes it hard is
 * the elision rather than the tempo — winding a synthetic voice up until it
 * garbles would be simulating difficulty, which the spec rules out in as many
 * words.
 */
const PACE_RATE: Record<ListeningPace, number> = {
  clear: 1,
  natural: 1.15,
};

/** The support version. Slow enough to pick words out, not slow enough to distort. */
const SLOW_RATE = 0.7;

/** The silence between two speakers' turns, in milliseconds. */
const TURN_GAP_MS = 550;

/** How far ahead of the speech the room starts, so it is established first. */
const AMBIENCE_LEAD_MS = 350;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export type HeardAudio = {
  /** Plays the whole item once. `slow` is the support version. */
  play: (slow: boolean) => Promise<void>;
  stop: () => void;
  playing: boolean;
};

export function useHeardAudio({
  turns,
  language,
  pace,
  ambience,
}: {
  turns: HeardTurn[];
  language: Language;
  pace: ListeningPace;
  ambience?: AmbienceName;
}): HeardAudio {
  const settings = useSettings((s) => s.settings);
  const perspectives = useSettings((s) => s.perspectives);
  const lead = useSettings((s) => s.lead);
  const [playing, setPlaying] = useState(false);

  /**
   * Bumped by every play and every stop, so a run that is still walking its
   * turns when a second press arrives abandons itself rather than talking over
   * the new one. The ref rather than state because the running loop has to read
   * the current value, not the one it closed over.
   */
  const run = useRef(0);
  const quiet = useRef<() => void>(() => {});

  const stop = useCallback(() => {
    run.current++;
    stopPronunciation();
    speechService().stop();
    quiet.current();
    quiet.current = () => {};
    stopAmbience();
    setPlaying(false);
  }, []);

  // Leaving the screen mid-clip must not leave a voice or a room running.
  useEffect(() => stop, [stop]);

  const play = useCallback(
    async (slow: boolean) => {
      stop();
      const mine = ++run.current;
      setPlaying(true);

      if (ambience) {
        quiet.current = startAmbience(ambience);
        await sleep(AMBIENCE_LEAD_MS);
        if (run.current !== mine) return;
      }

      const rate = settings.speechRate * (slow ? SLOW_RATE : PACE_RATE[pace]);

      for (const [at, turn] of turns.entries()) {
        if (run.current !== mine) return;

        if (at > 0) {
          await sleep(TURN_GAP_MS);
          if (run.current !== mine) return;
        }

        await speakSide(turn, language, {
          rate,
          settings,
          perspectives,
          lead,
        });
      }

      if (run.current !== mine) return;
      quiet.current();
      quiet.current = () => {};
      stopAmbience();
      setPlaying(false);
    },
    [ambience, language, lead, pace, perspectives, settings, stop, turns],
  );

  return { play, stop, playing };
}

/**
 * One turn, in one language, at one rate.
 *
 * The form is the first one the learner's own perspectives select — which is
 * her own wording where the line is addressed to her, and the line's single
 * form where it is not. See `constants/listening` on why a heard line usually
 * has only one.
 */
async function speakSide(
  turn: HeardTurn,
  language: Language,
  options: {
    rate: number;
    settings: Settings;
    perspectives: SpeechPerspective[];
    lead: 'feminine' | 'masculine';
  },
): Promise<void> {
  const side = language === 'hebrew' ? turn.line.hebrew : turn.line.arabic;
  const form = wordForms(side, options.perspectives, options.lead)[0];
  if (!form) return;

  const plan = resolveTtsPlan(form, {
    language,
    allowCardText: options.settings.useCardPronunciationText,
  });

  // A bundled recording is the pronunciation rather than an attempt at one, so
  // it wins here as it does everywhere. It cannot be slowed — the element's own
  // rate would pitch-shift it — so the slow replay falls through to the engine,
  // which is the honest trade: a slower reading beats a chipmunk one.
  if (plan.audioPath && options.rate >= 1) {
    const played = await playPronunciation(plan.audioPath, clipUrl(plan.audioPath));
    if (played) return;
  }

  const service = speechService();
  if (!service.isAvailable()) return;
  const { text } = plan.speech;
  if (!text) return;

  await service.speak(text, {
    language,
    voiceId:
      language === 'hebrew'
        ? options.settings.hebrewVoiceUri
        : options.settings.arabicVoiceUri,
    rate: options.rate,
    // Always once. The repeat count is a study preference for drilling a word,
    // and hearing the sentence twice unasked would quietly hand her the first
    // rung of the hint ladder before she had climbed it.
    repeat: 1,
  });
}
