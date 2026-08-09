import type {
  AlphabetScript,
  AlphabetSkill,
  ArabicFormName,
  ArabicLetter,
  HebrewLetter,
  LetterAsset,
} from '../../types/alphabet';
import { isHebrewLetter } from '../../data/alphabets';
import { shuffle, type RNG } from '../../utils/random';
import {
  ARABIC_FORM_LABEL,
  contextualForms,
  handwrittenOf,
  hasHandwritten,
  printFormOf,
} from './forms';

/**
 * Multiple-choice questions about one letter.
 *
 * Pure, like the vocabulary prompt builder: given the letters and a source of
 * randomness it returns what to show and which option is right, and knows
 * nothing about React or the database.
 *
 * The rule worth stating out loud: a question is only built when the letter
 * can honestly be asked it. A letter with no handwritten asset gets no
 * handwriting question, and an Arabic letter that never changes shape gets no
 * contextual-form question — the caller drops the letter from that mode
 * rather than the app inventing a shape to test.
 */

export type PracticeMode =
  /** Show the printed shape, choose the name. */
  | 'recognise'
  /**
   * Show the letter as a card, turn it over, and mark yourself.
   *
   * Not a question this module builds — like `write`, it is a screen of its
   * own. It lives in the union so the mode picker, the deck filter and the
   * route builder all speak one vocabulary rather than special-casing it.
   */
  | 'cards'
  /** Show the name and sound, choose the shape. */
  | 'recall'
  /** Play the letter, choose the shape. */
  | 'listen'
  /** Show a drawn handwritten form, choose the name. */
  | 'handwritten'
  /** Show a joined shape, choose which letter it is. */
  | 'contextual'
  /** Trace or write the letter, then judge the attempt. */
  | 'write';

export const MODE_SKILL: Record<PracticeMode, AlphabetSkill> = {
  recognise: 'typedRecognition',
  // Self-marked, but the same skill: whether the learner can look at the shape
  // and name it. One column, however the question was put.
  cards: 'typedRecognition',
  recall: 'typedRecognition',
  listen: 'listeningRecognition',
  handwritten: 'handwrittenRecognition',
  contextual: 'contextualFormRecognition',
  write: 'writingAccuracy',
};

export const MODE_LABEL: Record<PracticeMode, string> = {
  recognise: 'See it, name it',
  cards: 'Flip cards',
  recall: 'Name to letter',
  listen: 'Listen and choose',
  handwritten: 'Read handwriting',
  contextual: 'Joined shapes',
  write: 'Write it',
};

export const MODE_DESCRIPTION: Record<PracticeMode, string> = {
  recognise: 'A printed letter, four names',
  cards: 'A letter, turned over — say the name, then mark yourself',
  recall: 'A name and a sound, four letters',
  listen: 'A recording, four letters',
  handwritten: 'A handwritten form, four names',
  contextual: 'A letter as it appears joined inside a word',
  write: 'Trace the shape, then write it from memory',
};

/** How many buttons a question offers, the right answer included. */
export const OPTION_COUNT = 4;

export type QuestionPrompt =
  | { kind: 'glyph'; glyph: string; script: AlphabetScript; caption?: string }
  | { kind: 'handwritten'; asset: LetterAsset; caption?: string }
  | {
      kind: 'name';
      name: string;
      transliteration: string;
      sound: string;
      caption?: string;
    }
  | {
      kind: 'audio';
      /** Passed straight to `LetterSpeaker`, so a bundled clip wins over TTS. */
      entryId: string;
      script: AlphabetScript;
      fallbackText: string;
      label: string;
      caption?: string;
    };

export type QuestionOption =
  | { letterId: string; kind: 'glyph'; glyph: string; script: AlphabetScript }
  | { letterId: string; kind: 'name'; name: string; transliteration: string };

export type PracticeQuestion = {
  letterId: string;
  script: AlphabetScript;
  mode: PracticeMode;
  skill: AlphabetSkill;
  question: string;
  prompt: QuestionPrompt;
  options: QuestionOption[];
  correctIndex: number;
};

type Letter = HebrewLetter | ArabicLetter;

/**
 * Whether this letter can be asked this mode at all.
 *
 * `write` is always answerable: the writing screen falls back to tracing the
 * glyph itself when no stroke sequence has been drawn yet.
 */
export function supportsMode(letter: Letter, mode: PracticeMode): boolean {
  switch (mode) {
    case 'handwritten':
      return hasHandwritten(letter);
    case 'contextual':
      return !isHebrewLetter(letter) && contextualForms(letter).length > 0;
    default:
      return true;
  }
}

/** The letters of a deck that a mode can honestly be run over. */
export function lettersForMode(letters: Letter[], mode: PracticeMode): Letter[] {
  return letters.filter((letter) => supportsMode(letter, mode));
}

/**
 * Distractors for one question, similar-looking letters first.
 *
 * Drilling ب against ن teaches the dot; drilling it against م teaches nothing,
 * because the learner can be right for the wrong reason. `similarTo` is
 * therefore preferred over the rest of the alphabet rather than merely mixed
 * into it.
 */
function pickDistractors(
  letter: Letter,
  pool: Letter[],
  count: number,
  rng: RNG,
  /** Two letters that read identically in this view are not a fair pair. */
  displayOf: (letter: Letter) => string,
): Letter[] {
  const taken = new Set([displayOf(letter)]);
  const chosen: Letter[] = [];

  const consider = (candidates: Letter[]) => {
    for (const candidate of candidates) {
      if (chosen.length >= count) return;
      if (candidate.id === letter.id) continue;
      const shown = displayOf(candidate);
      if (!shown || taken.has(shown)) continue;
      taken.add(shown);
      chosen.push(candidate);
    }
  };

  const similar = (letter.similarTo ?? [])
    .map((id) => pool.find((entry) => entry.id === id))
    .filter((entry): entry is Letter => Boolean(entry));

  consider(shuffle(similar, rng));
  consider(shuffle(pool, rng));
  return chosen;
}

function nameOption(letter: Letter): QuestionOption {
  return {
    letterId: letter.id,
    kind: 'name',
    name: letter.nameEnglish,
    transliteration: letter.transliteration,
  };
}

function glyphOption(letter: Letter, script: AlphabetScript): QuestionOption {
  return {
    letterId: letter.id,
    kind: 'glyph',
    glyph: printFormOf(letter),
    script,
  };
}

export type BuildQuestionOptions = {
  mode: PracticeMode;
  /** Letters the distractors may be drawn from. Usually the whole script. */
  pool: Letter[];
  rng?: RNG;
  /** Which joined shape to show. Chosen at random when omitted. */
  form?: ArabicFormName;
};

/**
 * One question, or undefined when the mode cannot be asked of this letter.
 *
 * Returning undefined rather than throwing lets a session skip a letter that a
 * later content drop will make answerable, without the caller pre-filtering
 * twice.
 */
export function buildQuestion(
  letter: Letter,
  script: AlphabetScript,
  opts: BuildQuestionOptions,
): PracticeQuestion | undefined {
  const { mode, pool } = opts;
  const rng = opts.rng ?? Math.random;
  // `write` and `cards` are screens rather than multiple-choice questions;
  // neither has options to build, and both have their own place to live.
  if (mode === 'write' || mode === 'cards' || !supportsMode(letter, mode)) {
    return undefined;
  }

  const optionsAreNames =
    mode === 'recognise' || mode === 'handwritten' || mode === 'contextual';
  const displayOf = optionsAreNames
    ? (entry: Letter) => entry.nameEnglish
    : (entry: Letter) => printFormOf(entry);

  const distractors = pickDistractors(
    letter,
    pool,
    OPTION_COUNT - 1,
    rng,
    displayOf,
  );

  const options = shuffle(
    [letter, ...distractors].map((entry) =>
      optionsAreNames ? nameOption(entry) : glyphOption(entry, script),
    ),
    rng,
  );
  const correctIndex = options.findIndex((option) => option.letterId === letter.id);

  const base = {
    letterId: letter.id,
    script,
    mode,
    skill: MODE_SKILL[mode],
    options,
    correctIndex,
  };

  switch (mode) {
    case 'recognise':
      return {
        ...base,
        question: 'Which letter is this?',
        prompt: { kind: 'glyph', glyph: printFormOf(letter), script },
      };

    case 'recall':
      return {
        ...base,
        question: 'Which one is ' + letter.nameEnglish + '?',
        prompt: {
          kind: 'name',
          name: letter.nameEnglish,
          transliteration: letter.transliteration,
          sound: letter.commonSound,
        },
      };

    case 'listen':
      return {
        ...base,
        question: 'Which letter did you hear?',
        prompt: {
          kind: 'audio',
          entryId: letter.id,
          script,
          fallbackText: letter.nameSpokenText,
          label: 'Play the letter again',
        },
      };

    case 'handwritten': {
      const asset = handwrittenOf(letter);
      if (!asset) return undefined;
      return {
        ...base,
        question: 'Which letter is this, written by hand?',
        prompt: { kind: 'handwritten', asset },
      };
    }

    case 'contextual': {
      if (isHebrewLetter(letter)) return undefined;
      const shapes = contextualForms(letter);
      const shape =
        (opts.form && shapes.find((entry) => entry.form === opts.form)) ??
        shapes[Math.floor(rng() * shapes.length)];
      if (!shape) return undefined;
      return {
        ...base,
        question: 'Which letter is this?',
        prompt: {
          kind: 'glyph',
          glyph: shape.glyph,
          script,
          caption: ARABIC_FORM_LABEL[shape.form],
        },
      };
    }
  }
}
