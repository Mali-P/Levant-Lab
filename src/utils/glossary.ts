import { SEED_CATEGORIES, type SeedSide } from '../constants/seed';
import { CLITICS, CURATED_GLOSSES } from '../constants/glossary';

export type GlossLanguage = 'hebrew' | 'arabic';

/**
 * One piece of a transliteration line: either a word that can be looked up, or
 * the spaces and punctuation between two words.
 */
export type TransliterationSegment = {
  text: string;
  /** False for the spacing and punctuation that holds the words apart. */
  word: boolean;
  /** What this word means on its own. Absent when nothing is known about it. */
  gloss?: string;
};

/**
 * A run of letters, apostrophes and hyphens.
 *
 * Hyphens sit inside a word rather than between two, because the starter table
 * writes both a joined numeral — akhat-esre — and a clitic — ve-akhat — that
 * way, and neither halves usefully on screen. `glossFor` splits the clitic back
 * off when it looks one up.
 *
 * The letter class covers the modifier letters the romanisation leans on: ʿ and
 * ʾ are `Lm`, and the macrons and dots below arrive as combining marks.
 */
const WORD = /[\p{L}\p{M}'’-]+/gu;

/** Everything a lookup should ignore: case, and edge punctuation. */
function normalise(word: string): string {
  return word.toLowerCase().replace(/^['’-]+|['’-]+$/g, '');
}

function transliterationsOf(side: SeedSide): string[] {
  const out: string[] = [side.transliteration];

  if (side.forms) {
    out.push(side.forms.feminine.transliteration ?? '');
    out.push(side.forms.masculine.transliteration ?? '');
  }

  if (side.speechForms) {
    for (const variant of Object.values(side.speechForms)) {
      if (variant && 'transliteration' in variant && variant.transliteration) {
        out.push(variant.transliteration);
      }
    }
  }

  return out.filter(Boolean);
}

/**
 * Every word the starter table already defines on its own.
 *
 * A card whose transliteration is a single word *is* a definition of that word,
 * so "khamse" is glossed by the card that teaches five without anyone writing
 * it down twice. Only single-word sides count: "ṣabāḥ el-khēr" says nothing
 * about ṣabāḥ by itself, and the curated list covers those pieces instead.
 *
 * A word taught by more than one card keeps every reading, because a learner
 * hovering it is better served by "hello · peace" than by whichever card the
 * loop happened to reach first.
 */
function buildDerived(): Record<GlossLanguage, Map<string, string>> {
  const collected: Record<GlossLanguage, Map<string, Set<string>>> = {
    hebrew: new Map(),
    arabic: new Map(),
  };

  for (const category of SEED_CATEGORIES) {
    for (const deck of category.decks) {
      for (const card of deck.cards) {
        const sides: [GlossLanguage, SeedSide][] = [
          ['hebrew', card.hebrew],
          ['arabic', card.arabic],
        ];

        for (const [language, side] of sides) {
          for (const text of transliterationsOf(side)) {
            const words = text.match(WORD) ?? [];
            if (words.length !== 1) continue;

            const key = normalise(words[0]);
            if (!key) continue;

            const meanings = collected[language].get(key) ?? new Set<string>();
            meanings.add(card.english);
            collected[language].set(key, meanings);
          }
        }
      }
    }
  }

  /**
   * Drops "six (with a noun)" where plain "six" is already one of the readings.
   *
   * A parenthesis on a card prompt says which card this is, not what the word
   * means, and Hebrew שש is taught by both. Only the redundant reading goes: a
   * word that is *only* ever "clean (verb)" keeps its parenthesis, because
   * there nothing plainer was ever written.
   */
  const withoutRedundantContext = (meanings: Set<string>): string[] => {
    const plain = [...meanings].filter((meaning) => !meaning.includes('('));
    return [...meanings].filter(
      (meaning) => !plain.some((bare) => meaning.startsWith(bare + ' (')),
    );
  };

  const flatten = (source: Map<string, Set<string>>) =>
    new Map(
      [...source].map(([key, meanings]) => [
        key,
        // Three readings is already more than a hover is worth reading; a word
        // with more than that is a common one whose first senses are the ones
        // being asked about.
        withoutRedundantContext(meanings).slice(0, 3).join(' · '),
      ]),
    );

  return { hebrew: flatten(collected.hebrew), arabic: flatten(collected.arabic) };
}

let derivedGlosses: Record<GlossLanguage, Map<string, string>> | null = null;

function derived(language: GlossLanguage): Map<string, string> {
  derivedGlosses ??= buildDerived();
  return derivedGlosses[language];
}

/** A word's own meaning, before any clitic is taken into account. */
function plainGloss(language: GlossLanguage, key: string): string | undefined {
  // The curated list wins. It is written word by word, where the derived index
  // can only ever repeat whatever a whole card happened to mean.
  return CURATED_GLOSSES[language][key] ?? derived(language).get(key);
}

/**
 * What one transliterated word means.
 *
 * Words joined to a clitic by a hyphen — ve-arba, el-khēr, bil-bēt — are looked
 * up by their stem and read back through the clitic, so the starter table does
 * not have to spell out "and four" beside "and five" beside "and six". Only
 * hyphenated clitics decompose: a bare `la` is the Hebrew word for "to her" and
 * has to stay one.
 */
export function glossFor(
  language: GlossLanguage,
  word: string,
): string | undefined {
  const key = normalise(word);
  if (!key) return undefined;

  const direct = plainGloss(language, key);
  if (direct) return direct;

  const hyphen = key.indexOf('-');
  if (hyphen > 0) {
    const clitic = CLITICS[language][key.slice(0, hyphen)];
    const stem = plainGloss(language, key.slice(hyphen + 1));
    if (clitic && stem) return clitic.replace('…', stem);
  }

  return undefined;
}

/**
 * A transliteration line broken into words and the spacing between them, each
 * word carrying whatever is known about it.
 *
 * Returned as segments rather than rendered here, so the caller decides what a
 * hover looks like and the split itself can be tested without a DOM.
 */
export function readTransliteration(
  text: string,
  language: GlossLanguage,
): TransliterationSegment[] {
  const segments: TransliterationSegment[] = [];
  let index = 0;

  for (const match of text.matchAll(WORD)) {
    const start = match.index ?? 0;
    if (start > index) {
      segments.push({ text: text.slice(index, start), word: false });
    }
    segments.push({
      text: match[0],
      word: true,
      gloss: glossFor(language, match[0]),
    });
    index = start + match[0].length;
  }

  if (index < text.length) {
    segments.push({ text: text.slice(index), word: false });
  }

  return segments;
}
