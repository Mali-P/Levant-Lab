import { describe, expect, it } from 'vitest';
import {
  answerPractice,
  createPracticeSession,
  currentLetterId,
  practiceProgress,
  remainingInPass,
  skipCurrent,
  type PracticeSession,
} from './session';

const NOW = '2026-08-06T12:00:00.000Z';

function start(letterIds: string[]): PracticeSession {
  return createPracticeSession({
    id: 'session-1',
    script: 'hebrew',
    deckId: 'all',
    mode: 'recognise',
    letterIds,
    now: NOW,
    shuffleLetters: false,
  });
}

/** Answers the letter on screen, keeping the pile in its promoted order. */
function answer(session: PracticeSession, correct: boolean) {
  return answerPractice(session, correct, { now: NOW, shuffleRetry: false });
}

describe('createPracticeSession', () => {
  it('refuses an empty deck rather than starting a session with no letters', () => {
    expect(() => start([])).toThrow(/empty deck/i);
  });

  it('keeps the given order when shuffling is off, for the worst-first decks', () => {
    expect(start(['gimel', 'alef', 'bet']).queue).toEqual(['gimel', 'alef', 'bet']);
  });
});

describe('answerPractice', () => {
  it('moves on after a right answer', () => {
    const outcome = answer(start(['alef', 'bet']), true);
    expect(outcome.event).toBe('continue');
    expect(currentLetterId(outcome.session)).toBe('bet');
    expect(outcome.session.completed).toEqual(['alef']);
  });

  it('sends a missed letter to the retry pile', () => {
    const outcome = answer(start(['alef', 'bet']), false);
    expect(outcome.event).toBe('retry-queued');
    expect(outcome.session.retry).toEqual(['alef']);
    expect(outcome.session.missed).toEqual(['alef']);
  });

  it('promotes the retry pile when the pass empties', () => {
    let session = start(['alef', 'bet']);
    session = answer(session, false).session;
    const outcome = answer(session, true);

    expect(outcome.event).toBe('retry-round');
    expect(outcome.session.queue).toEqual(['alef']);
    expect(outcome.session.retry).toEqual([]);
    expect(currentLetterId(outcome.session)).toBe('alef');
  });

  it('completes only once every letter has been answered correctly', () => {
    let session = start(['alef', 'bet']);
    session = answer(session, false).session;
    session = answer(session, true).session; // pile promoted
    const outcome = answer(session, true); // alef, second time

    expect(outcome.event).toBe('session-complete');
    expect(outcome.session.completedAt).toBe(NOW);
    expect(currentLetterId(outcome.session)).toBeUndefined();
    expect(outcome.session.asked).toBe(3);
    expect(outcome.session.correct).toBe(2);
  });

  it('keeps asking a letter that is missed again, and lists it once', () => {
    let session = start(['alef', 'bet']);
    session = answer(session, false).session;
    session = answer(session, true).session; // promotes ['alef']
    session = answer(session, false).session; // alef missed again

    // The pass was one letter long, so missing it empties the pass and
    // promotes the pile in the same step: alef comes straight back round.
    expect(session.queue).toEqual(['alef']);
    expect(session.retry).toEqual([]);
    expect(session.missed).toEqual(['alef']);
    expect(currentLetterId(session)).toBe('alef');
  });

  it('takes back a completion when the letter is later missed', () => {
    let session = start(['alef', 'bet', 'alef']);
    session = answer(session, true).session;
    expect(session.completed).toEqual(['alef']);

    session = answer(session, true).session; // bet
    session = answer(session, false).session; // alef again, wrong

    expect(session.completed).toEqual(['bet']);
    // Last letter of the pass, so the pile is promoted in the same step.
    expect(session.queue).toEqual(['alef']);
    expect(session.retry).toEqual([]);
  });

  it('never mutates the session it was given', () => {
    const session = start(['alef', 'bet']);
    const before = JSON.stringify(session);
    answer(session, false);
    expect(JSON.stringify(session)).toBe(before);
  });

  it('refuses an answer once the session is complete', () => {
    const done = answer(start(['alef']), true).session;
    expect(() => answer(done, true)).toThrow(/no letter/i);
  });
});

describe('progress reporting', () => {
  it('counts the letter on screen as still remaining', () => {
    expect(remainingInPass(start(['alef', 'bet', 'gimel']))).toBe(3);
  });

  it('never goes backwards past its starting point when a letter is missed', () => {
    let session = start(['alef', 'bet']);
    const atStart = practiceProgress(session);
    session = answer(session, false).session;

    expect(practiceProgress(session)).toBeGreaterThanOrEqual(atStart);
    expect(practiceProgress(session)).toBe(0);
  });

  it('reads 1 once the deck is finished', () => {
    const done = answer(start(['alef']), true).session;
    expect(practiceProgress(done)).toBe(1);
  });
});

describe('skipCurrent', () => {
  it('drops a letter without scoring it or queueing a retry', () => {
    const session = skipCurrent(start(['alef', 'bet']), { now: NOW });

    expect(currentLetterId(session)).toBe('bet');
    expect(session.asked).toBe(0);
    expect(session.retry).toEqual([]);
    expect(session.missed).toEqual([]);
  });

  it('completes the session when the last letter is the one skipped', () => {
    const session = skipCurrent(start(['alef']), { now: NOW });
    expect(session.completedAt).toBe(NOW);
  });

  it('promotes the retry pile when the skip empties the pass', () => {
    let session = start(['alef', 'bet']);
    session = answer(session, false).session;
    session = skipCurrent(session, { now: NOW, shuffleRetry: false });

    expect(session.queue).toEqual(['alef']);
    expect(session.completedAt).toBeUndefined();
  });
});
