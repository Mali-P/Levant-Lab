import { describe, expect, it } from 'vitest';
import { type SeedSide } from '../constants/seed';
import {
  GLOSSED_CATEGORIES,
  GLOSSED_LOOSE_CARDS,
  glossedSides,
  glossFor,
  readTransliteration,
} from './glossary';

type Lang = 'hebrew' | 'arabic';

/** Every romanisation the starter table carries, variants included. */
function transliterationsOf(side: SeedSide): string[] {
  const out = [side.transliteration];

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

function everyLine(): { where: string; language: Lang; text: string }[] {
  const lines: { where: string; language: Lang; text: string }[] = [];

  // Cues included, via `glossedSides` — a question a learner is asked is
  // hovered exactly like the answer she gives, so a word appearing only inside
  // one still has to mean something.
  for (const category of GLOSSED_CATEGORIES) {
    for (const deck of category.decks) {
      for (const card of deck.cards) {
        const at = category.name + ' › ' + deck.name + ' › ' + card.english;
        for (const { language, side, meaning } of glossedSides(card)) {
          for (const text of transliterationsOf(side)) {
            lines.push({
              where: at + ' › “' + meaning + '” (' + language + ')',
              language,
              text,
            });
          }
        }
      }
    }
  }

  // And the lines a level shows without installing — Tell Me About It's story
  // builds, short stories and connector examples. They are hovered exactly as a
  // card is, so a word appearing only in one still has to mean something.
  for (const card of GLOSSED_LOOSE_CARDS) {
    for (const { language, side, meaning } of glossedSides(card)) {
      for (const text of transliterationsOf(side)) {
        lines.push({
          where: 'loose line › “' + meaning + '” (' + language + ')',
          language,
          text,
        });
      }
    }
  }

  return lines;
}

const LINES = everyLine();

describe('reading a transliteration', () => {
  it('gives back exactly the line it was handed', () => {
    // The segments are rendered in order, so anything lost or invented here is
    // lost or invented on the card.
    for (const { where, language, text } of LINES) {
      const rebuilt = readTransliteration(text, language)
        .map((segment) => segment.text)
        .join('');
      expect(rebuilt, where).toBe(text);
    }
  });

  it('keeps a hyphenated clitic in one piece', () => {
    const words = readTransliteration('esrim ve-shesh', 'hebrew').filter(
      (segment) => segment.word,
    );
    expect(words.map((segment) => segment.text)).toEqual(['esrim', 've-shesh']);
  });

  it('carries the meaning of each word it knows', () => {
    const segments = readTransliteration('ṣabāḥ il-khēr', 'arabic');
    expect(segments.filter((s) => s.word).map((s) => s.gloss)).toEqual([
      'morning',
      'the goodness',
    ]);
  });
});

describe('glossing one word', () => {
  it("reads a single-word card as that word's own definition", () => {
    // Nobody wrote "khamse" down twice: the card that teaches five is what
    // makes the word inside "khamse w-ʿishrīn" readable.
    expect(glossFor('arabic', 'khamse')).toContain('five');
  });

  it('prefers the curated meaning over the card it appears on', () => {
    // ṣabāḥ appears only on "good morning", and means "morning" on its own.
    expect(glossFor('arabic', 'ṣabāḥ')).toBe('morning');
  });

  it('reads a clitic through to the word it is written onto', () => {
    expect(glossFor('hebrew', 've-shesh')).toBe('and six');
    expect(glossFor('arabic', 'w-ʿishrīn')).toBe('and twenty');
    expect(glossFor('arabic', 'bil-madrase')).toBe('in the school');
  });

  it('lets a card defining the whole token beat the decomposition', () => {
    // bil-bēt read as "in the house" from its pieces until a Conversation Flow
    // reply taught the phrase outright. Decomposition is the fallback for a
    // token nothing defines, never an override of one something does.
    expect(glossFor('arabic', 'bil-bēt')).toBe('At home');
  });

  it('never splits a word that merely starts like a clitic', () => {
    // Hebrew la is "to her"; only a hyphen makes something a prefix.
    expect(glossFor('hebrew', 'la')).toBe('to her — with yesh, "she has"');
    expect(glossFor('arabic', 'law')).toContain('if');
  });

  it('ignores case and the punctuation around a word', () => {
    expect(glossFor('hebrew', 'Yesh')).toBe(glossFor('hebrew', 'yesh'));
  });

  it('says nothing about a word it does not know', () => {
    expect(glossFor('hebrew', 'zzzz')).toBeUndefined();
    expect(glossFor('arabic', '')).toBeUndefined();
  });

  it('keeps the two languages apart', () => {
    expect(glossFor('arabic', 'min')).toBe('from / of');
  });
});

describe('the glossary against the starter table', () => {
  it('has a meaning for every word in every transliteration', () => {
    // The point of the hover is that a learner can ask about any word in a
    // phrase. A word with no answer is a gap in the content rather than in the
    // interface, so it fails here instead of rendering as plain text.
    const missing = new Map<string, string>();

    for (const { where, language, text } of LINES) {
      for (const segment of readTransliteration(text, language)) {
        if (segment.word && !segment.gloss) {
          missing.set(language + ' ' + segment.text, where);
        }
      }
    }

    expect([...missing].map(([word, where]) => word + ' — ' + where)).toEqual([]);
  });
});
