/**
 * The alphabet modules.
 *
 * Deliberately a separate vocabulary from the flashcard types: a letter is not
 * a word with two translations, and forcing it into `Flashcard` would mean
 * inventing an English "meaning" for א and a Hebrew half for ب.
 *
 * Every handwritten and stroke-order slot is optional on purpose. An authentic
 * Israeli cursive form or an Arabic writing sequence cannot be faked by
 * slanting the printed glyph, so a letter without that asset must render one
 * fewer view rather than a wrong one. `validate-alphabet` reports the gaps.
 */

export type AlphabetScript = 'hebrew' | 'arabic';

/** Which visual style of a letter is being shown or practised. */
export type LetterStyle = 'print' | 'handwritten';

/**
 * A drawn letterform that a font cannot supply.
 *
 * `src` is a path under the bundled assets, e.g.
 * `assets/alphabets/hebrew/handwritten/alef.svg`. Vector is preferred so the
 * form stays sharp when a learner scales the app up.
 */
export type LetterAsset = {
  src: string;
  /** Described to a screen reader, e.g. "handwritten Alef". */
  label: string;
};

/**
 * One writing sequence: the ordered strokes of a single letterform.
 *
 * Held as SVG path data on a shared square so the same data drives the
 * animation, the tracing guide and the free-writing comparison at any size.
 */
export type StrokeSequence = {
  /** Side of the square the paths are drawn on. Always 100 for authored data. */
  viewBox: number;
  strokes: Array<{
    /** SVG path `d`, in viewBox units. */
    d: string;
    /** Where the pen lands, for the start-point dot. */
    start: [number, number];
    /** Short instruction shown beside the step, e.g. "down, then hook left". */
    hint?: string;
  }>;
};

/** Print and handwritten strokes are taught separately; neither substitutes. */
export type StrokeOrder = Partial<Record<LetterStyle, StrokeSequence>>;

export type ExampleWord = {
  script: string;
  english: string;
  transliteration?: string;
  /** Sent to the generator instead of `script` to force the intended reading. */
  pronunciationText?: string;
  /** Filled in from the generated manifest; never authored by hand. */
  audioPath?: string;
};

/**
 * A sound the letter makes that its bare printed form does not show, such as
 * Hebrew בּ against ב. Kept beside the letter rather than as a separate letter,
 * because the learner is looking at one letter with two readings.
 */
export type SoundVariant = {
  /** The letter carrying its mark, e.g. `בּ`. */
  form: string;
  transliteration: string;
  sound: string;
  note?: string;
};

export type HebrewLetter = {
  id: string;
  order: number;
  nameEnglish: string;
  /** Vocalised, so the name renders correctly when marks are shown. */
  nameHebrew: string;

  printForm: string;
  handwrittenForm?: LetterAsset;

  transliteration: string;
  commonSound: string;
  /** What the generator should say for the letter's name. */
  nameSpokenText: string;
  /** A syllable that demonstrates the sound, e.g. `בַּ`. Never shown as the letter. */
  soundSpokenText?: string;

  /** The shape this letter takes at the end of a word, where it has one. */
  finalForm?: string;
  finalHandwrittenForm?: LetterAsset;

  soundVariants?: SoundVariant[];
  exampleWord?: ExampleWord;
  strokeOrder?: StrokeOrder;
  /** ids of letters this one is easily confused with. */
  similarTo?: string[];
};

/** Contextual shapes. Only `isolated` is guaranteed. */
export type ArabicForms = {
  isolated: string;
  initial?: string;
  medial?: string;
  final?: string;
};

export type ArabicFormName = keyof ArabicForms;

export type ArabicHandwrittenForms = Partial<
  Record<ArabicFormName, LetterAsset>
>;

export type ArabicLetter = {
  id: string;
  order: number;

  nameEnglish: string;
  nameArabic: string;
  transliteration: string;
  commonSound: string;
  /**
   * How the letter is actually said in Palestinian/Jordanian Levantine when
   * that differs from the textbook Modern Standard reading. Shown so the
   * learner is never taught a pronunciation they will not hear.
   */
  levantineNote?: string;

  nameSpokenText: string;
  soundSpokenText?: string;

  forms: ArabicForms;
  handwrittenForms?: ArabicHandwrittenForms;

  /** Always true for the 28 letters: each takes a joined shape after a letter. */
  connectsFromPrevious: boolean;
  /** False for ا د ذ ر ز و, which break the join after themselves. */
  connectsToNext: boolean;

  exampleWord?: ExampleWord;
  strokeOrder?: Partial<Record<ArabicFormName, StrokeSequence>>;
  handwrittenStrokeOrder?: Partial<Record<ArabicFormName, StrokeSequence>>;
  similarTo?: string[];
};

/**
 * A vowel mark. Not a letter, and kept in its own section so the learner never
 * counts 31 Hebrew letters or 34 Arabic ones.
 */
export type VowelMark = {
  id: string;
  order: number;
  script: AlphabetScript;
  nameEnglish: string;
  /** Hebrew or Arabic spelling of the mark's own name. */
  nameNative: string;
  /** The bare mark, carried on a dotted circle so it is visible alone. */
  symbol: string;
  sound: string;
  transliteration: string;
  /** The mark attached to a demonstration consonant, e.g. `בַ` or `بَ`. */
  attachedExample: string;
  /** Reading of `attachedExample`, e.g. "ba". */
  attachedTransliteration: string;
  nameSpokenText: string;
  soundSpokenText?: string;
  exampleWord?: ExampleWord;
  note?: string;
};

/**
 * A character that is not one of the 28 Arabic letters but appears constantly
 * in real text: the hamza carriers, tāʾ marbūṭa, alif maqṣūra, lam-alif.
 */
export type ArabicExtraCharacter = {
  id: string;
  order: number;
  character: string;
  nameEnglish: string;
  nameArabic: string;
  transliteration: string;
  /** One or two sentences on what the character is for. */
  role: string;
  nameSpokenText: string;
  forms?: ArabicForms;
  exampleWord?: ExampleWord;
};

/** A set of letters learners mix up, practised together on purpose. */
export type SimilarLetterGroup = {
  id: string;
  script: AlphabetScript;
  /** Letter ids in the group. */
  letterIds: string[];
  /** What actually separates them, e.g. "the dot count under the base shape". */
  difference: string;
};

/**
 * One learner's standing on one letter.
 *
 * Four separate scores because recognising printed א says nothing about
 * reading it in cursive, hearing it, or writing it. `mastered` is only true
 * when every skill the letter actually offers has been met.
 */
export type AlphabetProgress = {
  letterId: string;
  script: AlphabetScript;
  typedRecognition: number;
  handwrittenRecognition: number;
  listeningRecognition: number;
  writingAccuracy: number;
  /** Arabic only: recognising initial/medial/final shapes. */
  contextualFormRecognition?: number;
  lastPractisedAt?: string;
  incorrectCount: number;
  mastered: boolean;
};

/** The skill an exercise exercises, and so the score it moves. */
export type AlphabetSkill =
  | 'typedRecognition'
  | 'handwrittenRecognition'
  | 'listeningRecognition'
  | 'writingAccuracy'
  | 'contextualFormRecognition';

/** How the learner wants letters displayed while studying. */
export type AlphabetDisplay = 'print' | 'handwritten' | 'both';
