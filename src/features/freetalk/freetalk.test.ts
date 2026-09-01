import { describe, expect, it } from 'vitest';
import type { Category, Deck, Flashcard, Settings } from '../../types';
import type { SayResponse } from '../../services/freetalk/protocol';
import {
  alreadySaved,
  partnerGender,
  recordConversation,
  recordPhraseSaved,
  statsFor,
  strugglePhrases,
  wantedCard,
  wantedCategory,
  wantedDeck,
} from './freetalk';
import {
  STRUGGLE_PHRASE_LIMIT,
  WANTED_CATEGORY_NAME,
  WANTED_DECK_NAME,
} from '../../constants/freetalk';

const category: Category = {
  id: 'cat_wanted',
  name: WANTED_CATEGORY_NAME,
  icon: 'x',
  order: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const deck: Deck = {
  id: 'deck_wanted',
  categoryId: category.id,
  name: WANTED_DECK_NAME,
  perfectRunsRequired: 3,
  promptDirections: ['en>he+ar'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const phrase: SayResponse = {
  english: "I'm going to visit my friend tomorrow",
  hebrew: { script: 'הש', transliteration: 'he' },
  arabic: { script: 'الع', transliteration: 'ar' },
};

function card(id: string, english: string, createdAt: string): Flashcard {
  return {
    id,
    categoryId: category.id,
    deckId: deck.id,
    english,
    hebrew: { script: 'x' },
    arabic: { script: 'y' },
    createdAt,
    updatedAt: createdAt,
  };
}

describe('the Free Conversation record', () => {
  const bare = { freeTalkStats: undefined } as Pick<Settings, 'freeTalkStats'>;

  it('starts every language at zero', () => {
    expect(statsFor(bare, 'hebrew').conversations).toBe(0);
  });

  it('counts a conversation, its turns, and whether it needed help', () => {
    const one = recordConversation(bare, 'hebrew', { turns: 4, helped: false });
    const stats = statsFor(one, 'hebrew');
    expect(stats.conversations).toBe(1);
    expect(stats.withoutHelp).toBe(1);
    expect(stats.turns).toBe(4);
  });

  it('a helped conversation still counts, but not as independent', () => {
    const one = recordConversation(bare, 'arabic', { turns: 7, helped: true });
    const stats = statsFor(one, 'arabic');
    expect(stats.conversations).toBe(1);
    expect(stats.withoutHelp).toBe(0);
  });

  it('keeps the two languages apart', () => {
    const one = recordConversation(bare, 'hebrew', { turns: 3, helped: false });
    expect(statsFor(one, 'arabic').conversations).toBe(0);
  });

  it('is a plain count, never a percentage', () => {
    const one = recordPhraseSaved(bare, 'hebrew');
    const two = recordPhraseSaved(one, 'hebrew');
    expect(statsFor(two, 'hebrew').phrasesSaved).toBe(2);
  });
});

describe('the Things I Wanted to Say collection', () => {
  it('is found by name, case-insensitively', () => {
    const renamed = { ...category, name: WANTED_CATEGORY_NAME.toUpperCase() };
    expect(wantedCategory([renamed])).toBe(renamed);
    expect(wantedDeck([deck], category.id)).toBe(deck);
    expect(wantedDeck([deck], undefined)).toBeUndefined();
  });

  it('never saves the same phrase twice', () => {
    const cards = [card('c1', phrase.english, '2026-01-02T00:00:00.000Z')];
    expect(alreadySaved(cards, deck.id, phrase.english.toUpperCase())).toBe(true);
    expect(alreadySaved(cards, deck.id, 'something else')).toBe(false);
  });

  it('turns a taught phrase into an ordinary two-language card', () => {
    const made = wantedCard(phrase, category, deck, 5);
    expect(made.deckId).toBe(deck.id);
    expect(made.categoryId).toBe(category.id);
    expect(made.english).toBe(phrase.english);
    expect(made.order).toBe(5);
    expect(made.hebrew.script).toBe(phrase.hebrew.script);
    expect(made.arabic.script).toBe(phrase.arabic.script);
    expect(made.arabic.dialect).toBe('Palestinian');
  });

  it('hands back the newest phrases first, capped', () => {
    const cards = Array.from({ length: STRUGGLE_PHRASE_LIMIT + 3 }, (_, at) =>
      card(
        'c' + at,
        'phrase ' + at,
        `2026-01-${String(at + 1).padStart(2, '0')}T00:00:00.000Z`,
      ),
    );
    const recent = strugglePhrases(cards, deck.id);
    expect(recent).toHaveLength(STRUGGLE_PHRASE_LIMIT);
    expect(recent[0]).toBe('phrase ' + (STRUGGLE_PHRASE_LIMIT + 2));
    expect(strugglePhrases(cards, undefined)).toEqual([]);
  });
});

describe('the partner persona', () => {
  it('is drawn from the listeners she practises speaking to', () => {
    expect(partnerGender(['female'], () => 0)).toBe('female');
    expect(partnerGender(['male', 'female'], () => 0.9)).toBe('female');
    expect(partnerGender(['male', 'female'], () => 0)).toBe('male');
  });

  it('falls back rather than crashing on an impossible empty list', () => {
    expect(partnerGender([], () => 0)).toBe('male');
  });
});
