import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../services/database/db';
import { DEFAULT_SETTINGS } from '../services/database/defaults';
import type { Category, Deck, Flashcard } from '../types';
import { useData } from './dataStore';
import { useSession } from './sessionStore';
import { useSettings } from './settingsStore';

const NOW = '2026-08-10T09:00:00.000Z';

const category: Category = {
  id: 'cat',
  name: 'Basics',
  icon: 'x',
  order: 0,
  createdAt: NOW,
  updatedAt: NOW,
};

const deck: Deck = {
  id: 'deck',
  categoryId: category.id,
  name: 'First words',
  order: 0,
  perfectRunsRequired: 10,
  promptDirections: ['en>he+ar'],
  createdAt: NOW,
  updatedAt: NOW,
};

const card: Flashcard = {
  id: 'card',
  categoryId: category.id,
  deckId: deck.id,
  english: 'hello',
  hebrew: { script: 'שלום', transliteration: 'shalom' },
  arabic: { script: 'مرحبا', transliteration: 'marhaba' },
  createdAt: NOW,
  updatedAt: NOW,
};

async function seedDeck() {
  await db.categories.put(category);
  await db.decks.put(deck);
  await db.cards.put(card);
  useData.setState({
    categories: [category],
    decks: [deck],
    cards: [card],
    cardProgress: {},
    deckProgress: {},
    loaded: true,
  });
}

beforeEach(async () => {
  await db.delete();
  await db.open();
  useSettings.setState({
    settings: DEFAULT_SETTINGS,
    languages: ['hebrew', 'arabic'],
    perspectives: ['femaleToMale', 'femaleToFemale'],
    lead: 'feminine',
    loaded: true,
  });
  useSession.setState({
    session: null,
    lastOutcome: null,
    awaitingAdvance: false,
    history: [],
  });
  useData.setState({
    categories: [],
    decks: [],
    cards: [],
    cardProgress: {},
    deckProgress: {},
    loaded: false,
  });
});

describe('practice progress', () => {
  it('records a vocabulary practice answer in memory and IndexedDB', async () => {
    await seedDeck();

    await useSession.getState().start({
      deckId: deck.id,
      cards: [card],
      mode: 'normal',
      answerMode: 'self',
      promptDirection: 'en>he+ar',
      perfectRunsRequired: deck.perfectRunsRequired,
    });
    await useSession.getState().nextIntro();

    await useSession.getState().submit({ hebrew: true, arabic: false });

    const live = useData.getState().cardProgress[card.id];
    const stored = await db.cardProgress.get(card.id);

    expect(live.hebrew.correct).toBe(1);
    expect(live.arabic.incorrect).toBe(1);
    expect(stored?.hebrew.correct).toBe(1);
    expect(stored?.arabic.incorrect).toBe(1);
  });

  it('only updates the language being practised in one-language mode', async () => {
    await seedDeck();
    useSettings.setState({
      ...useSettings.getState(),
      settings: { ...DEFAULT_SETTINGS, studyLanguages: 'hebrew' },
      languages: ['hebrew'],
    });

    await useSession.getState().start({
      deckId: deck.id,
      cards: [card],
      mode: 'normal',
      answerMode: 'self',
      promptDirection: 'en>he+ar',
      perfectRunsRequired: deck.perfectRunsRequired,
    });
    await useSession.getState().nextIntro();

    await useSession.getState().submit({ hebrew: true, arabic: true });

    const progress = useData.getState().cardProgress[card.id];
    expect(progress.hebrew.correct).toBe(1);
    expect(progress.arabic.correct + progress.arabic.incorrect).toBe(0);
  });
});
