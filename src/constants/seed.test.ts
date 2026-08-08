import { describe, expect, it } from 'vitest';
import {
  isNotApplicable,
  isSameAs,
  SPEECH_PERSPECTIVES,
  type LanguageSide,
  type SpeechPerspective,
} from '../types';
import { clipsForSide } from '../services/audio/paths';
import { speechWordForms, wordForms } from '../utils/wordForms';
import { SEED_CATEGORIES, type SeedSide } from './seed';

type Entry = {
  /** `Greetings › How are you? › how are you? (arabic)` — enough to fix a card. */
  where: string;
  side: SeedSide;
};

function everySide(): Entry[] {
  const entries: Entry[] = [];
  for (const category of SEED_CATEGORIES) {
    for (const deck of category.decks) {
      for (const card of deck.cards) {
        const at = category.name + ' › ' + deck.name + ' › ' + card.english;
        entries.push({ where: at + ' (hebrew)', side: card.hebrew });
        entries.push({ where: at + ' (arabic)', side: card.arabic });
      }
    }
  }
  return entries;
}

const SIDES = everySide();

/**
 * Decks whose feminine/masculine pair is a third-person verb — "she reads /
 * he reads". That is the subject's gender, not the conversation's, so these
 * stay word pairs. Listed by name so a later sweep that converts one to a
 * speaker/listener variant has to argue with this test first.
 */
const THIRD_PERSON_DECKS = [
  'Morning to night',
  'Things you do',
  'Out and about',
  'Sport and play',
  'Cleaning the house',
  'Looking after yourself',
  'Using a phone',
  'Power and connection',
  'Core verbs',
  'More everyday verbs',
];

describe('the starter table', () => {
  it('leads every gendered pair with the feminine form', () => {
    for (const { where, side } of SIDES) {
      if (!side.forms) continue;
      expect(side.script, where).toBe(side.forms.feminine.script);
      expect(side.transliteration, where).toBe(
        side.forms.feminine.transliteration,
      );
    }
  });

  it('reads the feminine form first out of wordForms', () => {
    for (const { where, side } of SIDES) {
      if (!side.forms || side.speechForms) continue;
      const [first, second] = wordForms(side as LanguageSide);
      expect(first.gender, where).toBe('feminine');
      expect(second.gender, where).toBe('masculine');
    }
  });

  it('leads every conversation card with the female-to-male wording', () => {
    for (const { where, side } of SIDES) {
      if (!side.speechForms) continue;
      const [primary] = speechWordForms(side as LanguageSide, ['femaleToMale']);
      expect(primary?.script, where).toBe(side.script);
      expect(primary?.transliteration, where).toBe(side.transliteration);
    }
  });

  it('never says a card is unsaid in a perspective it has no wording for', () => {
    for (const { where, side } of SIDES) {
      if (!side.speechForms) continue;
      for (const perspective of SPEECH_PERSPECTIVES) {
        const variant = side.speechForms[perspective];
        expect(variant, where + ' ' + perspective).toBeDefined();
        expect(isNotApplicable(variant!), where + ' ' + perspective).toBe(false);
      }
    }
  });

  it('points at a repeated wording instead of copying it', () => {
    for (const { where, side } of SIDES) {
      if (!side.speechForms) continue;

      const seen = new Map<string, SpeechPerspective>();
      for (const perspective of SPEECH_PERSPECTIVES) {
        const variant = side.speechForms[perspective];
        if (!variant || isSameAs(variant) || isNotApplicable(variant)) continue;

        const wording = variant.script + '|' + (variant.transliteration ?? '');
        const earlier = seen.get(wording);
        expect(
          earlier,
          where +
            ': ' +
            perspective +
            ' repeats ' +
            earlier +
            ' word for word; use { sameAs } so the two share one recording',
        ).toBeUndefined();
        seen.set(wording, perspective);
      }
    }
  });

  it('records one clip per distinct spoken wording, not one per perspective', () => {
    for (const { where, side } of SIDES) {
      if (!side.speechForms) continue;

      const clips = clipsForSide('probe', 'hebrew', side as LanguageSide);
      const distinct = new Set(
        speechWordForms(side as LanguageSide, SPEECH_PERSPECTIVES).map(
          (form) => form.script + '|' + (form.transliteration ?? ''),
        ),
      );

      expect(clips.length, where).toBe(distinct.size);
      expect(new Set(clips.map((clip) => clip.key)).size, where).toBe(
        clips.length,
      );
    }
  });

  it('keeps third-person conjugations as word pairs', () => {
    for (const category of SEED_CATEGORIES) {
      for (const deck of category.decks) {
        if (!THIRD_PERSON_DECKS.includes(deck.name)) continue;
        for (const card of deck.cards) {
          const at = deck.name + ' › ' + card.english;
          expect(card.hebrew.speechForms, at).toBeUndefined();
          expect(card.arabic.speechForms, at).toBeUndefined();
        }
      }
    }
  });

  it('never carries a gendered pair and a set of perspectives on one side', () => {
    // The two axes are independent, but nothing in the starter table needs
    // both at once — a side with both would be describing the word's gender
    // and the conversation's in the same breath, which is the confusion the
    // split exists to end.
    for (const { where, side } of SIDES) {
      expect(Boolean(side.forms && side.speechForms), where).toBe(false);
    }
  });
});
