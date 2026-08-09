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
 * Verb decks and the person each one is written in.
 *
 * They were all third-person once — بتصحى, "she wakes up" — sitting under bare
 * English prompts like "wake up". A learner reading that card and saying what
 * it showed her was describing somebody else. Naming the person here is what
 * stops that returning: a card can only be third person if its English says so.
 */
/**
 * Cards inside those decks that are not verbs at all, and whose pair really is
 * the word's own gender. Named individually so the exemption stays a decision
 * rather than a hole the next adjective can wander into.
 */
const WORD_GENDER_IN_VERB_DECKS = ['clean (describing something)'];

const VERB_DECK_PERSON: Record<string, 'first' | 'imperative'> = {
  'Morning to night': 'imperative',
  'Things you do': 'first',
  'Out and about': 'first',
  'Sport and play': 'first',
  'Cleaning the house': 'first',
  'Looking after yourself': 'first',
  'Using a phone': 'first',
  'Power and connection': 'first',
  'Core verbs': 'first',
  'More everyday verbs': 'first',
};

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

  it('only claims an agreement where there is a pair to choose between', () => {
    for (const { where, side } of SIDES) {
      if ((side as LanguageSide).agreement === undefined) continue;
      expect((side as LanguageSide).forms, where).toBeDefined();
    }
  });

  it('says who every verb-deck pair belongs to', () => {
    // The rule the decks were re-authored under: a gendered pair on a verb
    // card is somebody in the conversation, and it has to name which. An
    // untagged pair here would be a third-person conjugation again.
    for (const category of SEED_CATEGORIES) {
      for (const deck of category.decks) {
        const person = VERB_DECK_PERSON[deck.name];
        if (!person) continue;
        const wanted = person === 'imperative' ? 'listener' : 'speaker';
        for (const card of deck.cards) {
          if (WORD_GENDER_IN_VERB_DECKS.includes(card.english)) continue;
          for (const side of [card.hebrew, card.arabic]) {
            if (!side.forms) continue;
            expect(side.agreement, deck.name + ' › ' + card.english).toBe(wanted);
          }
        }
      }
    }
  });

  it('writes an English prompt that admits which person it teaches', () => {
    // "wake up" over a third-person verb is how this went wrong. A first
    // person card has to say "I", and a command is left bare — but a bare
    // prompt is only allowed where the forms really are imperatives.
    for (const category of SEED_CATEGORIES) {
      for (const deck of category.decks) {
        const person = VERB_DECK_PERSON[deck.name];
        if (!person) continue;
        for (const card of deck.cards) {
          if (WORD_GENDER_IN_VERB_DECKS.includes(card.english)) continue;
          const at = deck.name + ' › ' + card.english;
          const verbCard = Boolean(card.hebrew.forms ?? card.arabic.forms);
          if (!verbCard) continue;
          expect(/^I\b/.test(card.english), at).toBe(person === 'first');
        }
      }
    }
  });

  it('never manufactures a pair where the language has none', () => {
    // Palestinian Arabic says "I read" one way for everybody. Splitting that
    // into a feminine and a masculine to match Hebrew would be inventing a
    // distinction and then teaching it.
    for (const category of SEED_CATEGORIES) {
      for (const deck of category.decks) {
        if (VERB_DECK_PERSON[deck.name] !== 'first') continue;
        for (const card of deck.cards) {
          if (WORD_GENDER_IN_VERB_DECKS.includes(card.english)) continue;
          const at = deck.name + ' › ' + card.english;
          expect(card.arabic.forms, at).toBeUndefined();
        }
      }
    }
  });

  it('keeps verb conjugations out of the speaker/listener variant table', () => {
    for (const category of SEED_CATEGORIES) {
      for (const deck of category.decks) {
        if (!VERB_DECK_PERSON[deck.name]) continue;
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
