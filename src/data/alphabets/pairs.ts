import type { ArabicLetter, HebrewLetter } from '../../types/alphabet';
import { ARABIC_LETTERS } from './arabic';
import { HEBREW_LETTERS } from './hebrew';

/**
 * The two alphabets set against each other, letter for letter.
 *
 * Hebrew and Arabic are the same abjad twice: both descend from the Phoenician
 * order, so ג sits where ج sits and ק where ق sits, and a learner taking on
 * both at once is really learning twenty-two shapes twice over rather than
 * fifty shapes once. Pairing them is the whole point of the Both module — meet
 * the sound, then meet the two ways it is written.
 *
 * The pairing is by descent, not by modern sound. ج is Hebrew ג even though
 * Levantine says it "j", and צ is ص even though one is "ts" and the other an
 * emphatic "s". Where the reading has drifted far enough to mislead, `note`
 * says so on the card rather than leaving the learner to reconcile it.
 *
 * Six Arabic letters have no Hebrew partner: ث خ ذ ض ظ غ. Classical Arabic
 * kept distinctions Hebrew merged away, so each of these branches off a letter
 * the learner has already met. They come last, together, rather than being
 * slipped in beside their bases — a run of six letters that exist on one side
 * only is a fact about the two alphabets worth meeting as a group.
 */

export type LetterPair = {
  /** Stable and URL-safe: `bet-ba`, `tha`. */
  id: string;
  /** 1-based, abjad order, the six Arabic-only letters trailing. */
  order: number;
  /** The headline the card is asked by, e.g. `b` or `sh`. */
  sound: string;
  /** How the sound is described in words, under the prompt. */
  description: string;
  hebrewId?: string;
  arabicId?: string;
  /** Where the two have drifted apart, or which letter an extra branches off. */
  note?: string;
};

export const LETTER_PAIRS: readonly LetterPair[] = [
  {
    id: 'alef-alif',
    order: 1,
    sound: 'ʾ / ā',
    description: 'A silent carrier, and a long a',
    hebrewId: 'alef',
    arabicId: 'alif',
  },
  {
    id: 'bet-ba',
    order: 2,
    sound: 'b',
    description: 'As in bed',
    hebrewId: 'bet',
    arabicId: 'ba',
    note: 'Hebrew ב without its dot is a v; Arabic ب is always b.',
  },
  {
    id: 'gimel-jim',
    order: 3,
    sound: 'g / j',
    description: 'Hard g in Hebrew, j in Levantine Arabic',
    hebrewId: 'gimel',
    arabicId: 'jim',
  },
  {
    id: 'dalet-dal',
    order: 4,
    sound: 'd',
    description: 'As in door',
    hebrewId: 'dalet',
    arabicId: 'dal',
  },
  {
    id: 'he-ha',
    order: 5,
    sound: 'h',
    description: 'As in hat',
    hebrewId: 'he',
    arabicId: 'ha_soft',
  },
  {
    id: 'vav-waw',
    order: 6,
    sound: 'v / w',
    description: 'v in Hebrew, w in Arabic — and a long u in both',
    hebrewId: 'vav',
    arabicId: 'waw',
  },
  {
    id: 'zayin-zay',
    order: 7,
    sound: 'z',
    description: 'As in zoo',
    hebrewId: 'zayin',
    arabicId: 'zay',
  },
  {
    id: 'het-ha',
    order: 8,
    sound: 'ḥ',
    description: 'From the throat',
    hebrewId: 'het',
    arabicId: 'ha',
    note: 'Modern Hebrew ח is a rasping kh; Arabic ح is breathier, further down.',
  },
  {
    id: 'tet-ta',
    order: 9,
    sound: 'ṭ',
    description: 'A heavy t',
    hebrewId: 'tet',
    arabicId: 'ta_emphatic',
    note: 'Hebrew ט lost the emphasis; Arabic ط still carries it.',
  },
  {
    id: 'yod-ya',
    order: 10,
    sound: 'y / ī',
    description: 'As in yes — and a long i',
    hebrewId: 'yod',
    arabicId: 'ya',
  },
  {
    id: 'kaf-kaf',
    order: 11,
    sound: 'k',
    description: 'As in kite',
    hebrewId: 'kaf',
    arabicId: 'kaf',
    note: 'Hebrew כ without its dot is kh; Arabic ك is always k.',
  },
  {
    id: 'lamed-lam',
    order: 12,
    sound: 'l',
    description: 'As in look',
    hebrewId: 'lamed',
    arabicId: 'lam',
  },
  {
    id: 'mem-mim',
    order: 13,
    sound: 'm',
    description: 'As in moon',
    hebrewId: 'mem',
    arabicId: 'mim',
  },
  {
    id: 'nun-nun',
    order: 14,
    sound: 'n',
    description: 'As in noon',
    hebrewId: 'nun',
    arabicId: 'nun',
  },
  {
    id: 'samekh-sin',
    order: 15,
    sound: 's',
    description: 'As in sun',
    hebrewId: 'samekh',
    arabicId: 'sin',
  },
  {
    id: 'ayin-ain',
    order: 16,
    sound: 'ʿ',
    description: 'A tightening deep in the throat',
    hebrewId: 'ayin',
    arabicId: 'ain',
    note: 'Most Israeli speakers no longer sound ע; Arabic ع is fully pronounced.',
  },
  {
    id: 'pe-fa',
    order: 17,
    sound: 'p / f',
    description: 'p in Hebrew, f in Arabic',
    hebrewId: 'pe',
    arabicId: 'fa',
    note: 'Hebrew פ without its dot is f, which is where Arabic ف settled.',
  },
  {
    id: 'tsadi-sad',
    order: 18,
    sound: 'ts / ṣ',
    description: 'ts in Hebrew, a heavy s in Arabic',
    hebrewId: 'tsadi',
    arabicId: 'sad',
  },
  {
    id: 'qof-qaf',
    order: 19,
    sound: 'q',
    description: 'k made far back in the mouth',
    hebrewId: 'qof',
    arabicId: 'qaf',
    note: 'Hebrew ק is now a plain k; Palestinian Arabic often says ق as a glottal stop.',
  },
  {
    id: 'resh-ra',
    order: 20,
    sound: 'r',
    description: 'Throaty in Hebrew, rolled in Arabic',
    hebrewId: 'resh',
    arabicId: 'ra',
  },
  {
    id: 'shin-shin',
    order: 21,
    sound: 'sh',
    description: 'As in shoe',
    hebrewId: 'shin',
    arabicId: 'shin',
  },
  {
    id: 'tav-ta',
    order: 22,
    sound: 't',
    description: 'As in table',
    hebrewId: 'tav',
    arabicId: 'ta',
  },

  // The six Arabic letters with no Hebrew partner.
  {
    id: 'tha',
    order: 23,
    sound: 'th',
    description: 'As in think',
    arabicId: 'tha',
    note: 'Arabic only. ث is ت with two more dots; Hebrew merged this sound into ת.',
  },
  {
    id: 'kha',
    order: 24,
    sound: 'kh',
    description: 'As in Bach',
    arabicId: 'kha',
    note: 'Arabic only. خ is ح with a dot — and it is the sound Hebrew ח has become.',
  },
  {
    id: 'dhal',
    order: 25,
    sound: 'dh',
    description: 'As in this',
    arabicId: 'dhal',
    note: 'Arabic only. ذ is د with a dot; Hebrew merged this sound into ד.',
  },
  {
    id: 'dad',
    order: 26,
    sound: 'ḍ',
    description: 'A heavy d',
    arabicId: 'dad',
    note: 'Arabic only. ض is ص with a dot, and the letter Arabic names itself after.',
  },
  {
    id: 'za',
    order: 27,
    sound: 'ẓ',
    description: 'A heavy dh',
    arabicId: 'za',
    note: 'Arabic only. ظ is ط with a dot.',
  },
  {
    id: 'ghain',
    order: 28,
    sound: 'gh',
    description: 'Like a French r, gargled',
    arabicId: 'ghain',
    note: 'Arabic only. غ is ع with a dot; Hebrew merged this sound into ע.',
  },
];

/**
 * The letter records behind one pair, either of which may be missing — an
 * Arabic-only row has no Hebrew half, and a build that dropped a letter should
 * render one column rather than a broken one.
 */
export function pairLetters(pair: LetterPair): {
  hebrew?: HebrewLetter;
  arabic?: ArabicLetter;
} {
  return {
    hebrew: pair.hebrewId
      ? HEBREW_LETTERS.find((letter) => letter.id === pair.hebrewId)
      : undefined,
    arabic: pair.arabicId
      ? ARABIC_LETTERS.find((letter) => letter.id === pair.arabicId)
      : undefined,
  };
}

export function findLetterPair(id: string): LetterPair | undefined {
  return LETTER_PAIRS.find((pair) => pair.id === id);
}

/** How many letters a pair actually puts on screen: two, or one for the extras. */
export function pairSize(pair: LetterPair): number {
  const { hebrew, arabic } = pairLetters(pair);
  return (hebrew ? 1 : 0) + (arabic ? 1 : 0);
}
