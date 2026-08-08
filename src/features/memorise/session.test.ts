import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../utils/random';
import {
  createMemoriseSession,
  currentMemoriseCardId,
  flipCard,
  memoriseProgress,
  nextCard,
  previousCard,
  remainingToView,
  restartMemorise,
  type MemoriseSession,
} from './session';

const NOW = '2026-08-07T12:00:00.000Z';

function start(cardIds: string[], shuffleCards = false): MemoriseSession {
  return createMemoriseSession({
    deckId: 'deck-1',
    cardIds,
    now: NOW,
    shuffleCards,
  });
}

/** Reveals the current card and moves on, the way the screen drives it. */
function readAndAdvance(session: MemoriseSession): MemoriseSession {
  return nextCard(flipCard(session, NOW), NOW);
}

describe('createMemoriseSession', () => {
  it('refuses an empty deck rather than opening on nothing', () => {
    expect(() => start([])).toThrow(/empty deck/i);
  });

  it('keeps the deck order when the learner has shuffling switched off', () => {
    expect(start(['c', 'a', 'b']).order).toEqual(['c', 'a', 'b']);
  });

  it('shuffles when the learner has shuffling switched on', () => {
    const session = createMemoriseSession({
      deckId: 'deck-1',
      cardIds: ['a', 'b', 'c', 'd', 'e', 'f'],
      now: NOW,
      shuffleCards: true,
      rng: mulberry32(7),
    });

    expect([...session.order].sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(session.order).not.toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });

  it('opens on the front of the first card with nothing viewed', () => {
    const session = start(['a', 'b']);
    expect(currentMemoriseCardId(session)).toBe('a');
    expect(session.flipped).toBe(false);
    expect(session.viewed).toEqual([]);
  });
});

describe('flipCard', () => {
  it('reveals the back and counts the card as viewed', () => {
    const session = flipCard(start(['a', 'b']), NOW);
    expect(session.flipped).toBe(true);
    expect(session.viewed).toEqual(['a']);
  });

  it('flips back to the front without un-viewing the card', () => {
    const session = flipCard(flipCard(start(['a', 'b']), NOW), NOW);
    expect(session.flipped).toBe(false);
    expect(session.viewed).toEqual(['a']);
  });

  it('counts a card once however many times it is turned over', () => {
    let session = start(['a', 'b']);
    for (let i = 0; i < 5; i++) session = flipCard(session, NOW);
    expect(session.viewed).toEqual(['a']);
  });

  it('never mutates the session it was given', () => {
    const session = start(['a', 'b']);
    flipCard(session, NOW);
    expect(session.flipped).toBe(false);
    expect(session.viewed).toEqual([]);
  });
});

describe('nextCard', () => {
  it('moves to the next card face down', () => {
    const session = nextCard(flipCard(start(['a', 'b']), NOW), NOW);
    expect(currentMemoriseCardId(session)).toBe('b');
    expect(session.flipped).toBe(false);
  });

  it('does not count a card skipped past without flipping', () => {
    const session = nextCard(start(['a', 'b']), NOW);
    expect(session.viewed).toEqual([]);
  });

  it('completes the pass on the last card', () => {
    let session = start(['a', 'b', 'c']);
    session = readAndAdvance(session);
    session = readAndAdvance(session);
    expect(session.completedAt).toBeUndefined();

    session = readAndAdvance(session);
    expect(session.completedAt).toBe(NOW);
    expect(session.viewed).toEqual(['a', 'b', 'c']);
    expect(currentMemoriseCardId(session)).toBeUndefined();
  });

  it('goes through the deck once and does not loop back round', () => {
    let session = start(['a', 'b']);
    session = readAndAdvance(session);
    session = readAndAdvance(session);

    expect(nextCard(session, NOW)).toBe(session);
  });
});

describe('previousCard', () => {
  it('steps back to the card before, face down', () => {
    let session = readAndAdvance(start(['a', 'b']));
    expect(currentMemoriseCardId(session)).toBe('b');

    session = flipCard(session, NOW);
    session = previousCard(session, NOW);

    expect(currentMemoriseCardId(session)).toBe('a');
    expect(session.flipped).toBe(false);
  });

  it('leaves the view tally alone — a card read once stays read', () => {
    let session = readAndAdvance(start(['a', 'b']));
    session = previousCard(session, NOW);
    expect(session.viewed).toEqual(['a']);
  });

  it('stops at the first card rather than wrapping to the last', () => {
    const session = start(['a', 'b', 'c']);
    expect(previousCard(session, NOW)).toBe(session);
  });

  it('does not reopen a pass that has finished', () => {
    let session = start(['a']);
    session = readAndAdvance(session);
    expect(session.completedAt).toBe(NOW);
    expect(previousCard(session, NOW)).toBe(session);
  });

  it('never mutates the session it was given', () => {
    const session = readAndAdvance(start(['a', 'b']));
    previousCard(session, NOW);
    expect(session.index).toBe(1);
  });

  it('walks the whole deck backwards and forwards again', () => {
    let session = start(['a', 'b', 'c']);
    session = nextCard(session, NOW);
    session = nextCard(session, NOW);
    expect(currentMemoriseCardId(session)).toBe('c');

    session = previousCard(session, NOW);
    session = previousCard(session, NOW);
    expect(currentMemoriseCardId(session)).toBe('a');

    session = nextCard(session, NOW);
    expect(currentMemoriseCardId(session)).toBe('b');
  });
});

describe('remainingToView and memoriseProgress', () => {
  it('counts the card on screen as still remaining', () => {
    expect(remainingToView(start(['a', 'b', 'c']))).toBe(3);
  });

  it('runs the count down to nothing as the pass finishes', () => {
    let session = start(['a', 'b']);
    expect(memoriseProgress(session)).toBe(0);

    session = readAndAdvance(session);
    expect(remainingToView(session)).toBe(1);
    expect(memoriseProgress(session)).toBe(0.5);

    session = readAndAdvance(session);
    expect(remainingToView(session)).toBe(0);
    expect(memoriseProgress(session)).toBe(1);
  });
});

describe('restartMemorise', () => {
  it('starts a clean pass over the same cards', () => {
    let session = start(['a', 'b']);
    session = readAndAdvance(session);
    session = readAndAdvance(session);

    const again = restartMemorise(session, { now: NOW, shuffleCards: false });
    expect(again.order).toEqual(['a', 'b']);
    expect(again.index).toBe(0);
    expect(again.viewed).toEqual([]);
    expect(again.completedAt).toBeUndefined();
  });
});

describe('what memorise mode deliberately has no notion of', () => {
  // Guards the one rule the whole mode rests on: looking at a word must never
  // reach the grading vocabulary. If any of these appear, memorise has started
  // scoring and the accuracy figures are no longer safe.
  it('carries no answer, mistake, retry or perfect-run state', () => {
    const session = flipCard(start(['a', 'b']), NOW);

    for (const key of [
      'answers',
      'correct',
      'missed',
      'retry',
      'retryCardIds',
      'currentRunFailed',
      'perfectRunsCompleted',
    ]) {
      expect(session).not.toHaveProperty(key);
    }
  });
});
