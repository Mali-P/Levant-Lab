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
  // Directions: telling somebody where to put themselves. Every pair in these
  // is the listener's gender, never a third-person conjugation.
  'Sit, stand and lie': 'imperative',
  'Going and stepping': 'imperative',
  'Come here and stay there': 'imperative',
  'Stop, wait and walk': 'imperative',
  'Holding and letting go': 'imperative',
  'Bending and leaning': 'imperative',
  'Head and looking': 'imperative',
  'In bed': 'imperative',
  'Moving things': 'imperative',
  'Slowly and gently': 'imperative',
};

describe('the starter table', () => {
  it('starts with the Basics of Basics section', () => {
    expect(SEED_CATEGORIES[0].name).toBe('Basics of Basics');
  });

  it('keeps the Basics of Basics concept pools naturally small', () => {
    const basics = SEED_CATEGORIES.find((category) => category.name === 'Basics of Basics');
    const conceptDecks = basics?.decks.filter(
      (deck) =>
        !deck.name.includes('Master Test') &&
        deck.studyLanguages?.length === 1 &&
        deck.studyLanguages[0] === 'hebrew',
    );

    expect(conceptDecks?.map((deck) => [deck.name, deck.cards.length])).toEqual([
      ['Directions — Hebrew', 4],
      ['Question words — Hebrew', 6],
      ['Basic pronouns — Hebrew', 8],
      ['Can — Hebrew', 8],
      ['Want — Hebrew', 8],
      ['Need — Hebrew', 8],
      ['Like — Hebrew', 8],
      ['Have — Hebrew', 6],
      ['This / that — Hebrew', 4],
      ['Basic answers — Hebrew', 3],
      ['Colours — Hebrew', 7],
      ['Days of the week — Hebrew', 7],
      ['Time of day — Hebrew', 5],
      ['Basic contrasts — Hebrew', 10],
      ['Basic quantity — Hebrew', 5],
      ['Basic movement — Hebrew', 4],
      ['Basic physical states / needs — Hebrew', 4],
    ]);
  });

  it('orders Basics of Basics by concept Hebrew, then concept Arabic, then final tests', () => {
    const basics = SEED_CATEGORIES.find((category) => category.name === 'Basics of Basics');
    expect(basics?.decks.map((deck) => [deck.name, deck.studyLanguages])).toEqual([
      ['Directions — Hebrew', ['hebrew']],
      ['Directions — Palestinian Arabic', ['arabic']],
      ['Directions — Both', ['hebrew', 'arabic']],
      ['Question words — Hebrew', ['hebrew']],
      ['Question words — Palestinian Arabic', ['arabic']],
      ['Question words — Both', ['hebrew', 'arabic']],
      ['Basic pronouns — Hebrew', ['hebrew']],
      ['Basic pronouns — Palestinian Arabic', ['arabic']],
      ['Basic pronouns — Both', ['hebrew', 'arabic']],
      ['Can — Hebrew', ['hebrew']],
      ['Can — Palestinian Arabic', ['arabic']],
      ['Can — Both', ['hebrew', 'arabic']],
      ['Want — Hebrew', ['hebrew']],
      ['Want — Palestinian Arabic', ['arabic']],
      ['Want — Both', ['hebrew', 'arabic']],
      ['Need — Hebrew', ['hebrew']],
      ['Need — Palestinian Arabic', ['arabic']],
      ['Need — Both', ['hebrew', 'arabic']],
      ['Like — Hebrew', ['hebrew']],
      ['Like — Palestinian Arabic', ['arabic']],
      ['Like — Both', ['hebrew', 'arabic']],
      ['Have — Hebrew', ['hebrew']],
      ['Have — Palestinian Arabic', ['arabic']],
      ['Have — Both', ['hebrew', 'arabic']],
      ['This / that — Hebrew', ['hebrew']],
      ['This / that — Palestinian Arabic', ['arabic']],
      ['This / that — Both', ['hebrew', 'arabic']],
      ['Basic answers — Hebrew', ['hebrew']],
      ['Basic answers — Palestinian Arabic', ['arabic']],
      ['Basic answers — Both', ['hebrew', 'arabic']],
      ['Colours — Hebrew', ['hebrew']],
      ['Colours — Palestinian Arabic', ['arabic']],
      ['Colours — Both', ['hebrew', 'arabic']],
      ['Days of the week — Hebrew', ['hebrew']],
      ['Days of the week — Palestinian Arabic', ['arabic']],
      ['Days of the week — Both', ['hebrew', 'arabic']],
      ['Time of day — Hebrew', ['hebrew']],
      ['Time of day — Palestinian Arabic', ['arabic']],
      ['Time of day — Both', ['hebrew', 'arabic']],
      ['Basic contrasts — Hebrew', ['hebrew']],
      ['Basic contrasts — Palestinian Arabic', ['arabic']],
      ['Basic contrasts — Both', ['hebrew', 'arabic']],
      ['Basic quantity — Hebrew', ['hebrew']],
      ['Basic quantity — Palestinian Arabic', ['arabic']],
      ['Basic quantity — Both', ['hebrew', 'arabic']],
      ['Basic movement — Hebrew', ['hebrew']],
      ['Basic movement — Palestinian Arabic', ['arabic']],
      ['Basic movement — Both', ['hebrew', 'arabic']],
      ['Basic physical states / needs — Hebrew', ['hebrew']],
      ['Basic physical states / needs — Palestinian Arabic', ['arabic']],
      ['Basic physical states / needs — Both', ['hebrew', 'arabic']],
      ['Hebrew Basics Master Test', ['hebrew']],
      ['Palestinian Arabic Basics Master Test', ['arabic']],
    ]);
  });

  it('builds each Basics final test from the current full concept pool', () => {
    const basics = SEED_CATEGORIES.find((category) => category.name === 'Basics of Basics');
    const conceptTotal = basics!.decks
      .filter(
        (deck) =>
          !deck.name.includes('Master Test') &&
          deck.studyLanguages?.length === 1 &&
          deck.studyLanguages[0] === 'hebrew',
      )
      .reduce((total, deck) => total + deck.cards.length, 0);

    expect(basics?.decks.find((deck) => deck.name === 'Hebrew Basics Master Test')?.cards).toHaveLength(conceptTotal);
    expect(basics?.decks.find((deck) => deck.name === 'Palestinian Arabic Basics Master Test')?.cards).toHaveLength(conceptTotal);
    expect(basics?.decks.find((deck) => deck.name === 'Hebrew Basics Master Test')?.masteryOnly).toBe(true);
    expect(basics?.decks.find((deck) => deck.name === 'Palestinian Arabic Basics Master Test')?.masteryOnly).toBe(true);
  });

  it('teaches bare foundational direction forms in Basics of Basics', () => {
    const basics = SEED_CATEGORIES.find((category) => category.name === 'Basics of Basics');
    const directions = basics?.decks.find((deck) => deck.name === 'Directions — Hebrew');

    expect(directions?.cards.map((card) => ({
      english: card.english,
      hebrew: card.hebrew.script,
      hebrewTransliteration: card.hebrew.transliteration,
      arabic: card.arabic.script,
      arabicTransliteration: card.arabic.transliteration,
    }))).toEqual([
      {
        english: 'up / above',
        hebrew: 'למעלה',
        hebrewTransliteration: 'lema\'la',
        arabic: 'فوق',
        arabicTransliteration: 'fo\'',
      },
      {
        english: 'down / below',
        hebrew: 'למטה',
        hebrewTransliteration: 'lemata',
        arabic: 'تحت',
        arabicTransliteration: 'taht',
      },
      {
        english: 'left',
        hebrew: 'שמאל',
        hebrewTransliteration: 'smol',
        arabic: 'شمال',
        arabicTransliteration: 'shmaal',
      },
      {
        english: 'right',
        hebrew: 'ימין',
        hebrewTransliteration: 'yamin',
        arabic: 'يمين',
        arabicTransliteration: 'yameen',
      },
    ]);
  });

  it('splits Basics gendered person forms into separate symbol-marked cards', () => {
    const basics = SEED_CATEGORIES.find((category) => category.name === 'Basics of Basics');
    const pronouns = basics?.decks.find((deck) => deck.name === 'Basic pronouns — Hebrew');
    const can = basics?.decks.find((deck) => deck.name === 'Can — Hebrew');

    expect(pronouns?.cards.map((card) => ({
      english: card.english,
      icon: card.icon,
      hebrew: card.hebrew.transliteration,
      arabic: card.arabic.transliteration,
      paired: Boolean(card.hebrew.forms || card.arabic.forms || card.hebrew.speechForms || card.arabic.speechForms),
    }))).toEqual([
      { english: 'I', icon: undefined, hebrew: 'ani', arabic: 'ana', paired: false },
      { english: 'you (female)', icon: '♀', hebrew: 'at', arabic: 'inti', paired: false },
      { english: 'you (male)', icon: '♂', hebrew: 'ata', arabic: 'inta', paired: false },
      { english: 'he', icon: undefined, hebrew: 'hu', arabic: 'huwwe', paired: false },
      { english: 'she', icon: undefined, hebrew: 'hi', arabic: 'hiyye', paired: false },
      { english: 'we', icon: undefined, hebrew: 'anakhnu', arabic: 'iḥna', paired: false },
      { english: 'they (female)', icon: '♀', hebrew: 'hen', arabic: 'hinne', paired: false },
      { english: 'they (male)', icon: '♂', hebrew: 'hem', arabic: 'humme', paired: false },
    ]);

    expect(can?.cards.map((card) => ({
      english: card.english,
      icon: card.icon,
      hebrew: card.hebrew.transliteration,
      arabic: card.arabic.transliteration,
      paired: Boolean(card.hebrew.forms || card.arabic.forms || card.hebrew.speechForms || card.arabic.speechForms),
    }))).toEqual([
      { english: 'I can (female)', icon: '♀', hebrew: 'ani yekhola', arabic: 'baʾdar', paired: false },
      { english: 'I can (male)', icon: '♂', hebrew: 'ani yakhol', arabic: 'baʾdar', paired: false },
      { english: 'I can\'t (female)', icon: '♀', hebrew: 'ani lo yekhola', arabic: 'ma baʾdar', paired: false },
      { english: 'I can\'t (male)', icon: '♂', hebrew: 'ani lo yakhol', arabic: 'ma baʾdar', paired: false },
      { english: 'you can (female)', icon: '♀', hebrew: 'at yekhola', arabic: 'btiʾdari', paired: false },
      { english: 'you can (male)', icon: '♂', hebrew: 'ata yakhol', arabic: 'btiʾdar', paired: false },
      { english: 'you can\'t (female)', icon: '♀', hebrew: 'at lo yekhola', arabic: 'ma btiʾdari', paired: false },
      { english: 'you can\'t (male)', icon: '♂', hebrew: 'ata lo yakhol', arabic: 'ma btiʾdar', paired: false },
    ]);
  });

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
