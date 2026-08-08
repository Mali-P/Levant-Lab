/**
 * The Palestinian pronunciations Levantry teaches, keyed by the Arabic word as
 * the cards write it.
 *
 * This exists because Arabic spelling underdetermines speech. Levantine is
 * written here without harakat, so `تنين` is equally readable as *tnēn* and as
 * something with a syllable it does not have, and `مرحبا` is equally readable
 * as *marḥaba* and as the textbook *marḥaban*. A speech engine picks one, and
 * left to itself it picks the Modern Standard reading — which is the one
 * Levantry is not teaching.
 *
 * So the pronunciation target comes from here rather than from the engine's
 * reading of the spelling. Two things are recorded per word, and they are not
 * the same thing:
 *
 *   `pronunciation` — the romanisation the learner is taught. The target. This
 *     is what the audio has to sound like, and what a reviewer checks against.
 *   `ttsText`       — the exact input that makes an engine produce it. Today
 *     that is the same word vocalised, because harakat is the one lever every
 *     Arabic voice honours. It is never a *different* word, and the learner
 *     never sees it.
 *
 * Vocalising is what does the work: `مَرْحَبا` cannot be read with tanwīn, and
 * `تْنِين` cannot take an opening vowel. Where a future engine offers phonemes
 * or SSML, `ttsText` is the field that changes and nothing else has to.
 *
 * A word absent from here is not an error — most cards carry a generated clip,
 * and a card may carry its own override. It only becomes an error when a
 * curated Arabic form has none of the three; `npm run validate-pronunciation`
 * is what says so.
 */

export type PronunciationEntry = {
  /** The taught romanisation. What the audio must sound like. */
  pronunciation: string;
  /**
   * The exact text handed to an Arabic speech engine to produce it — the same
   * word, vocalised. Never a respelling into a different word.
   */
  ttsText: string;
  dialect: 'palestinian';
  /** Why this word needs an entry, where that is not obvious. */
  notes?: string;
};

/**
 * Harakat, shadda, sukun, superscript alef, and tatweel — everything that can
 * be present or absent without changing which word is written.
 *
 * Stripped for lookup so `ستّة` and `ستة` are one key, and so an entry written
 * with its marks still answers a card written without them.
 */
const DIACRITICS = /[ً-ٰٟۖ-ۭـ]/g;

/** The lookup key for an Arabic word: unvocalised, single-spaced, trimmed. */
export function pronunciationKey(arabic: string): string {
  return arabic
    .normalize('NFC')
    .replace(DIACRITICS, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Every word whose spelling a generic Arabic voice reads wrongly for Levantry's
 * purposes, written as the card writes it.
 *
 * Deliberately not a transliteration table for the whole language. An entry
 * earns its place by being a word a reviewer has heard mispronounced, or one
 * whose spelling is known to admit a Modern Standard reading the deck does not
 * teach. One to ten is here in full — counting forms and with-a-noun forms
 * alike — because numbers are what a learner drills hardest and where a wrong
 * vowel is most audible.
 */
export const PALESTINIAN_PRONUNCIATIONS: Record<string, PronunciationEntry> = {
  // Greetings — the tanwīn trap. Vocalising the final alef leaves the engine
  // nowhere to put the -an it wants to add.
  'مرحبا': {
    pronunciation: 'marḥaba',
    ttsText: 'مَرْحَبا',
    dialect: 'palestinian',
    notes: 'Textbook مرحباً is read *marḥaban*; the spoken form has no tanwīn.',
  },
  'مرحبتين': {
    pronunciation: 'marḥabtēn',
    ttsText: 'مَرْحَبْتين',
    dialect: 'palestinian',
  },

  /*
   * One to ten, in both the shapes the language uses: the isolated counting
   * form, and the form a number takes in front of a noun.
   *
   * Both, because Levantry teaches both — counting in "One to ten", agreement
   * in "Numbers with nouns" — and locking only one of them would leave the
   * other to be guessed, which is the exact failure this file exists to stop.
   *
   * Holding a pair here is not the same as offering a pair on a card. This file
   * answers "how is this word said"; which word a deck teaches is the deck's
   * question, and the counting deck asks it once per number.
   */
  'وحدة': { pronunciation: 'waḥde', ttsText: 'وَحْدِة', dialect: 'palestinian' },
  'واحد': { pronunciation: 'wāḥad', ttsText: 'واحَد', dialect: 'palestinian' },

  'تنتين': { pronunciation: 'tintēn', ttsText: 'تِنْتين', dialect: 'palestinian' },
  'تنين': {
    pronunciation: 'tnēn',
    ttsText: 'تْنِين',
    dialect: 'palestinian',
    notes: 'Sukun on the tā is the whole point: it blocks an opening vowel.',
  },

  'تلات': { pronunciation: 'talāt', ttsText: 'تَلات', dialect: 'palestinian' },
  'تلاتة': { pronunciation: 'talāte', ttsText: 'تَلاتِة', dialect: 'palestinian' },

  'أربع': { pronunciation: 'arbaʿ', ttsText: 'أَرْبَع', dialect: 'palestinian' },
  'أربعة': { pronunciation: 'arbaʿa', ttsText: 'أَرْبَعَة', dialect: 'palestinian' },

  'خمس': { pronunciation: 'khams', ttsText: 'خَمْس', dialect: 'palestinian' },
  'خمسة': { pronunciation: 'khamse', ttsText: 'خَمْسِة', dialect: 'palestinian' },

  'ستّ': { pronunciation: 'sitt', ttsText: 'سِتّ', dialect: 'palestinian' },
  'ستّة': { pronunciation: 'sitte', ttsText: 'سِتِّة', dialect: 'palestinian' },

  'سبع': { pronunciation: 'sabaʿ', ttsText: 'سَبَع', dialect: 'palestinian' },
  'سبعة': { pronunciation: 'sabʿa', ttsText: 'سَبْعَة', dialect: 'palestinian' },

  'تمان': { pronunciation: 'tmān', ttsText: 'تْمان', dialect: 'palestinian' },
  'تمانية': { pronunciation: 'tmānye', ttsText: 'تْمانْيِة', dialect: 'palestinian' },

  'تسع': { pronunciation: 'tisaʿ', ttsText: 'تِسَع', dialect: 'palestinian' },
  'تسعة': { pronunciation: 'tisʿa', ttsText: 'تِسْعَة', dialect: 'palestinian' },

  'عشر': { pronunciation: 'ʿashar', ttsText: 'عَشَر', dialect: 'palestinian' },
  'عشرة': { pronunciation: 'ʿashara', ttsText: 'عَشَرَة', dialect: 'palestinian' },
};

/**
 * Built once, keyed by the unvocalised form, so a card written with harakat and
 * an entry written without still meet.
 *
 * A collision means two entries claim the same word once their marks are taken
 * off, which is a content bug rather than a runtime condition — it is thrown at
 * module load so it cannot ship.
 */
const BY_KEY = ((): Map<string, PronunciationEntry> => {
  const map = new Map<string, PronunciationEntry>();
  for (const [word, entry] of Object.entries(PALESTINIAN_PRONUNCIATIONS)) {
    const key = pronunciationKey(word);
    const existing = map.get(key);
    if (existing && existing.pronunciation !== entry.pronunciation) {
      throw new Error(
        'Two Palestinian pronunciations claim "' +
          key +
          '": ' +
          existing.pronunciation +
          ' and ' +
          entry.pronunciation,
      );
    }
    map.set(key, entry);
  }
  return map;
})();

/** The taught pronunciation of one Arabic word, if Levantry knows it. */
export function palestinianPronunciation(
  arabic: string,
): PronunciationEntry | undefined {
  return BY_KEY.get(pronunciationKey(arabic));
}
