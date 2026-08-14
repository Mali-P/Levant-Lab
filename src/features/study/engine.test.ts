import { describe, expect, it } from 'vitest';
import type { StudyMode, StudySession } from '../../types';
import { mulberry32, type RNG } from '../../utils/random';
import {
  answerCurrentCard,
  createSession,
  currentIntroCardId,
  describeStage,
  finishOrdering,
  flipIntroCard,
  introRemaining,
  isLadderSession,
  nextIntroCard,
  ORDER_INTERLUDE_AFTER,
  previousIntroCard,
  stageProgress,
  type AnswerOutcome,
} from './engine';
import { selfGradeResult } from './selfGrade';

const T = '2026-01-01T00:00:00.000Z';
const BOTH = { hebrew: true, arabic: true };
const NEITHER = { hebrew: false, arabic: false };
const HE_ONLY = { hebrew: true, arabic: false };

const DECK = Array.from({ length: 10 }, (_unused, i) => 'c' + (i + 1));

type StartOptions = {
  cards?: string[];
  mode?: StudyMode;
  perfectRoundsCompleted?: number;
  perfectRunsRequired?: number;
  drill?: boolean;
  sequenced?: boolean;
};

function start(o: StartOptions = {}): StudySession {
  return createSession({
    id: 'session_1',
    deckId: 'deck_1',
    cardIds: o.cards ?? DECK,
    mode: o.mode ?? 'normal',
    promptDirection: 'en>he+ar',
    answerMode: 'self',
    perfectRunsRequired: o.perfectRunsRequired ?? 10,
    perfectRoundsCompleted: o.perfectRoundsCompleted,
    drill: o.drill,
    sequenced: o.sequenced,
    now: T,
  });
}

function answer(
  s: StudySession,
  input: { hebrew: boolean; arabic: boolean },
  rng: RNG = mulberry32(1),
): AnswerOutcome {
  return answerCurrentCard(s, input, { now: T, rng });
}

/** Walks past every card of the current introduction and into testing. */
function readIntroduction(s: StudySession, rng: RNG): StudySession {
  let cur = s;
  while (cur.phase === 'introducing') {
    cur = flipIntroCard(cur, T);
    cur = nextIntroCard(cur, { now: T, rng });
  }
  return cur;
}

/** Answers correctly until the pass over the active set ends, clean. */
function clearPass(s: StudySession, rng: RNG): AnswerOutcome {
  let cur = s;
  let out: AnswerOutcome;
  let guard = 0;
  do {
    if (guard++ > 200) throw new Error('pass never cleared');
    out = answerCurrentCard(cur, BOTH, { now: T, rng });
    cur = out.session;
  } while (out.event === 'continue');
  return out;
}

/** Answers correctly until the current stage is cleared — both passes of it. */
function clearStage(s: StudySession, rng: RNG): AnswerOutcome {
  let cur = s;
  let out: AnswerOutcome | undefined;
  let guard = 0;
  while (cur.phase === 'testing') {
    if (guard++ > 500) throw new Error('stage never cleared');
    out = answerCurrentCard(cur, BOTH, { now: T, rng });
    cur = out.session;
  }
  return out!;
}

/** Climbs the whole ladder and stops on the first mastery round. */
function climbToMastery(s: StudySession, rng: RNG): StudySession {
  let cur = s;
  let guard = 0;
  while (cur.phase !== 'fullDeckMastery') {
    if (guard++ > 50) throw new Error('never reached mastery');
    cur = readIntroduction(cur, rng);
    cur = clearStage(cur, rng).session;
  }
  return cur;
}

/** Plays one mastery round through, optionally missing the card at `wrongAt`. */
function playRound(s: StudySession, rng: RNG, wrongAt?: number): AnswerOutcome {
  let cur = s;
  let out: AnswerOutcome | undefined;
  const round = s.currentRound;
  let guard = 0;

  while (cur.phase === 'fullDeckMastery' && cur.currentRound === round) {
    if (guard++ > 200) throw new Error('round never ended');
    const ok = wrongAt === undefined || cur.roundIndex !== wrongAt;
    out = answerCurrentCard(cur, ok ? BOTH : NEITHER, { now: T, rng });
    cur = out.session;
  }
  return out!;
}

describe('createSession', () => {
  it('opens on the first two cards, in the deck’s own order, introducing them', () => {
    const s = start();
    expect(s.phase).toBe('introducing');
    expect(s.activeCardCount).toBe(2);
    expect(s.activeCardIds).toEqual(['c1', 'c2']);
    expect(s.introduceCardIds).toEqual(['c1', 'c2']);
    expect(s.currentCardId).toBeUndefined();
  });

  it('opens on two rather than one, so there is something to tell apart', () => {
    // A single card is not a question: there is only one word it could be, and
    // a right answer would say nothing about whether she knows it.
    expect(start().activeCardIds.length).toBeGreaterThan(1);
    expect(start({ cards: ['c1', 'c2', 'c3'] }).activeCardIds).toEqual([
      'c1',
      'c2',
    ]);
  });

  it('does not expose the rest of the deck', () => {
    const s = start();
    expect(s.activeCardIds).not.toContain('c3');
    expect(s.deckCardIds).toHaveLength(10);
  });

  it('carries the deck’s banked perfect rounds in every mode', () => {
    expect(start({ perfectRoundsCompleted: 4 }).perfectRounds).toBe(4);
    expect(start({ mode: 'hard', perfectRoundsCompleted: 4 }).perfectRounds).toBe(
      4,
    );
  });

  it('refuses an empty deck', () => {
    expect(() => start({ cards: [] })).toThrow(/empty deck/i);
  });

  it('gives a drill its one card straight away, with nothing to introduce', () => {
    const s = start({ cards: ['c7'], drill: true });
    expect(s.phase).toBe('testing');
    expect(s.currentCardId).toBe('c7');
    expect(s.introduceCardIds).toEqual([]);
  });

  it('opens a mastery-only deck directly on a shuffled full-pool round', () => {
    const s = createSession({
      id: 'session_1',
      deckId: 'deck_1',
      cardIds: ['c1', 'c2', 'c3', 'c4'],
      mode: 'normal',
      promptDirection: 'en>he+ar',
      answerMode: 'self',
      perfectRunsRequired: 10,
      masteryOnly: true,
      now: T,
    });

    expect(s.phase).toBe('fullDeckMastery');
    expect(s.activeCardIds).toEqual(['c1', 'c2', 'c3', 'c4']);
    expect(s.introduceCardIds).toEqual([]);
    expect([...s.roundQueue].sort()).toEqual(['c1', 'c2', 'c3', 'c4']);
    expect(s.roundQueue).toHaveLength(4);
    expect(s.currentCardId).toBeDefined();
  });
});

describe('introducing', () => {
  it('records a card as read when it is turned over, and not before', () => {
    const s = start();
    expect(s.introducedCardIds).toEqual([]);
    expect(flipIntroCard(s, T).introducedCardIds).toEqual(['c1']);
  });

  it('does not un-read a card that is flipped back', () => {
    let s = flipIntroCard(start(), T);
    s = flipIntroCard(s, T);
    expect(s.introduceFlipped).toBe(false);
    expect(s.introducedCardIds).toEqual(['c1']);
  });

  it('walks forwards and back through the new words', () => {
    let s = nextIntroCard(start(), { now: T });
    expect(currentIntroCardId(s)).toBe('c2');
    s = previousIntroCard(s, T);
    expect(currentIntroCardId(s)).toBe('c1');
  });

  it('has nowhere to step back to from the first card', () => {
    const s = start();
    expect(previousIntroCard(s, T)).toBe(s);
  });

  it('switches into testing once the last new word has been passed', () => {
    const s = readIntroduction(start(), mulberry32(2));
    expect(s.phase).toBe('testing');
    expect(s.activeCardIds).toEqual(['c1', 'c2']);
    expect(['c1', 'c2']).toContain(s.currentCardId);
    expect(introRemaining(s)).toBe(0);
  });

  it('refuses to grade a card while the words are still being read', () => {
    expect(() => answer(start(), BOTH)).toThrow(/no active card/i);
  });
});

describe('testing a stage', () => {
  const rng = () => mulberry32(4);

  it('counts distinct cards recalled, not answers given', () => {
    const s = readIntroduction(start(), rng());
    const out = answerCurrentCard(s, BOTH, { now: T, rng: rng() });
    expect(out.session.phase).toBe('testing');
    expect(stageProgress(out.session)).toEqual({ recalled: 1, total: 2 });
  });

  it('keeps recalled progress as a chronological count separate from card order', () => {
    const s = readIntroduction(start(), rng());
    const out = answerCurrentCard(s, BOTH, { now: T, rng: rng() });
    expect(out.session.stageCorrect).toHaveLength(1);
    expect(stageProgress(out.session).recalled).toBe(1);
  });

  it('banks a clean 2/2 without growing the set', () => {
    const out = clearPass(readIntroduction(start(), rng()), rng());
    expect(out.event).toBe('stage-pass-complete');
    expect(out.session.phase).toBe('testing');
    expect(out.session.activeCardIds).toEqual(['c1', 'c2']);
    expect(out.session.stagePerfectRounds).toBe(1);
    // The pass starts again on the same two words, with nothing recalled yet.
    expect(out.session.stageCorrect).toEqual([]);
    expect(out.session.currentCardId).toBeDefined();
  });

  it('introduces one more word on the second clean pass in a row', () => {
    const out = clearStage(readIntroduction(start(), rng()), rng());
    expect(out.event).toBe('stage-complete');
    expect(out.session.phase).toBe('introducing');
    expect(out.session.activeCardCount).toBe(3);
    expect(out.session.activeCardIds).toEqual(['c1', 'c2', 'c3']);
    expect(out.session.introduceCardIds).toEqual(['c3']);
  });

  it('starts the new rung owing two clean passes of its own', () => {
    const grown = clearStage(readIntroduction(start(), rng()), rng()).session;
    expect(grown.stagePerfectRounds).toBe(0);
    expect(grown.stagePerfect).toBe(true);
  });

  it('puts the banked passes back to none when a card is missed', () => {
    const r = rng();
    const banked = clearPass(readIntroduction(start(), r), r).session;
    expect(banked.stagePerfectRounds).toBe(1);

    const missed = answerCurrentCard(banked, NEITHER, { now: T, rng: r });
    expect(missed.session.stagePerfectRounds).toBe(0);
    expect(missed.session.stagePerfect).toBe(false);

    // The spoiled pass still has to be finished — the missed word comes back
    // before anything else does — but finishing it banks nothing.
    const finished = clearPass(missed.session, r);
    expect(finished.event).toBe('stage-pass-complete');
    expect(finished.session.stagePerfectRounds).toBe(0);
    expect(finished.session.activeCardIds).toEqual(['c1', 'c2']);
  });

  it('keeps what she has already recalled in the pass she spoils', () => {
    const r = rng();
    let s = readIntroduction(start({ cards: ['c1', 'c2', 'c3'] }), r);
    s = clearStage(s, r).session; // 2 → 3
    s = readIntroduction(s, r);

    const first = answerCurrentCard(s, BOTH, { now: T, rng: r });
    const missed = answerCurrentCard(first.session, NEITHER, { now: T, rng: r });

    // The count of clean passes is what a miss costs. A word she has already
    // recalled in this pass is not taken away from her as well.
    expect(missed.session.stageCorrect).toEqual(first.session.stageCorrect);
    expect(stageProgress(missed.session).recalled).toBe(1);
  });

  it('needs two clean passes in a row, not two clean passes', () => {
    const r = rng();
    let s = readIntroduction(start(), r);

    s = clearPass(s, r).session;
    s = answerCurrentCard(s, NEITHER, { now: T, rng: r }).session;
    s = clearPass(s, r).session; // the spoiled one, finished
    s = clearPass(s, r).session; // the first that counts again

    expect(s.stagePerfectRounds).toBe(1);
    expect(s.activeCardCount).toBe(2);
    expect(clearPass(s, r).event).toBe('stage-complete');
  });

  it('takes a card back out of the cleared set when it is missed', () => {
    const r = rng();
    let s = readIntroduction(start(), r);

    const first = answerCurrentCard(s, BOTH, { now: T, rng: r });
    const cardId = first.session.stageCorrect[0];
    s = first.session;

    // Wrongly, so the other card cannot clear the stage out from under the one
    // being watched before it comes round again.
    let guard = 0;
    while (s.currentCardId !== cardId) {
      if (guard++ > 100) throw new Error('card never came back');
      s = answerCurrentCard(s, NEITHER, { now: T, rng: r }).session;
    }

    const missed = answerCurrentCard(s, NEITHER, { now: T, rng: r });
    expect(missed.event).toBe('retry-queued');
    expect(missed.session.stageCorrect).not.toContain(cardId);
    expect(missed.session.stageIncorrect).toContain(cardId);
    expect(missed.session.phase).toBe('testing');
  });

  it('treats a half-right answer as wrong, both languages together', () => {
    const s = readIntroduction(start(), rng());
    const out = answer(s, HE_ONLY);
    expect(out.fullyCorrect).toBe(false);
    expect(out.event).toBe('retry-queued');
    expect(out.session.stageCorrect).toEqual([]);
  });

  it('counts one-language self-graded correct answers as fully recalled', () => {
    const s = readIntroduction(start(), rng());
    const out = answer(s, selfGradeResult('correct', 'hebrew'));
    expect(out.fullyCorrect).toBe(true);
    expect(stageProgress(out.session)).toEqual({ recalled: 1, total: 2 });
  });

  it('does not ask the same card twice running', () => {
    const r = rng();
    let s = readIntroduction(start(), r);

    for (let i = 0; i < 20; i++) {
      const asked = s.currentCardId;
      const out = answerCurrentCard(s, NEITHER, { now: T, rng: r });
      expect(out.session.currentCardId).not.toBe(asked);
      s = out.session;
    }
  });

  it('mixes the older words back in once a newer one arrives', () => {
    const r = rng();
    let s = readIntroduction(start(), r);
    s = readIntroduction(clearStage(s, r).session, r); // 2 → 3
    s = readIntroduction(clearStage(s, r).session, r); // 3 → 4
    expect(s.activeCardIds).toHaveLength(4);

    const asked = new Set<string>();
    for (let i = 0; i < 40 && s.phase === 'testing'; i++) {
      asked.add(s.currentCardId!);
      s = answerCurrentCard(s, NEITHER, { now: T, rng: r }).session;
    }

    // The first two are not parked while she learns the third and fourth.
    expect(asked.has('c1') || asked.has('c2')).toBe(true);
    expect(asked.size).toBeGreaterThan(2);
  });

  it('climbs 2 → 3 → 4 → … → 10 and then begins mastery', () => {
    const r = rng();
    const sizes: number[] = [];
    let s = start();

    while (s.phase !== 'fullDeckMastery') {
      s = readIntroduction(s, r);
      sizes.push(s.activeCardIds.length);
      s = clearStage(s, r).session;
    }

    expect(sizes).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(s.currentRound).toBe(1);
    expect(s.roundQueue).toHaveLength(10);
  });

  it('adds exactly one word at each rung above the first', () => {
    const r = rng();
    let s = readIntroduction(start(), r);
    const added: number[] = [];

    while (s.phase !== 'fullDeckMastery') {
      s = clearStage(s, r).session;
      if (s.phase === 'introducing') added.push(s.introduceCardIds.length);
      s = readIntroduction(s, r);
    }

    expect(added).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
  });

  it('runs a six-card deck as 2 → 3 → 4 → 5 → 6', () => {
    const r = rng();
    const sizes: number[] = [];
    let s = start({ cards: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'] });

    while (s.phase !== 'fullDeckMastery') {
      s = readIntroduction(s, r);
      sizes.push(s.activeCardIds.length);
      s = clearStage(s, r).session;
    }

    expect(sizes).toEqual([2, 3, 4, 5, 6]);
  });

  it('hands the full deck over to mastery on one clean pass, not two', () => {
    // The last rung has no word waiting behind it, so the rule that buys the
    // next one has nothing to buy. Mastery does its own counting from here.
    const r = rng();
    let s = start();
    while (s.activeCardCount < 10) s = clearStage(readIntroduction(s, r), r).session;

    const out = clearPass(readIntroduction(s, r), r);
    expect(out.event).toBe('full-deck-reached');
    expect(out.session.phase).toBe('fullDeckMastery');
    expect(out.session.perfectRounds).toBe(0);
  });

  it('banks no perfect rounds for merely clearing the stages', () => {
    expect(climbToMastery(start(), rng()).perfectRounds).toBe(0);
  });
});

describe('the progress strip', () => {
  const rng = () => mulberry32(21);

  it('draws one row: a pip per card in the set, filled as she recalls them', () => {
    const r = rng();
    const s = readIntroduction(start(), r);
    expect(stageProgress(s)).toEqual({ recalled: 0, total: 2 });
    expect(stageProgress(answer(s, BOTH, r).session).recalled).toBe(1);
  });

  it('grows the row by a pip when the rung is bought', () => {
    const r = rng();
    const grown = readIntroduction(
      clearStage(readIntroduction(start(), r), r).session,
      r,
    );
    expect(stageProgress(grown)).toEqual({ recalled: 0, total: 3 });
  });

  it('empties for the second pass, and says why on the line above', () => {
    const r = rng();
    const s = clearPass(readIntroduction(start(), r), r).session;

    // One row means the pips do empty behind her, which on their own would read
    // as progress lost. The detail line is what stops it reading that way, so
    // it has to be saying the pass has been banked at exactly this moment.
    expect(stageProgress(s).recalled).toBe(0);
    expect(describeStage(s).detail).toBe('Clean pass 2 of 2');
  });
});

describe('a run left open before the one-card ladder', () => {
  const rng = () => mulberry32(21);

  /**
   * The same run as it sits in the database, written before the two counters
   * existed. The v4 migration drops only the sessions from before the ladder
   * itself, so a row like this one is resumed rather than thrown away.
   */
  function asStored(s: StudySession): StudySession {
    const row: Record<string, unknown> = { ...s };
    delete row.stagePerfectRounds;
    delete row.stagePerfect;
    return row as unknown as StudySession;
  }

  it('reads as nothing banked and a pass in hand that is still clean', () => {
    const s = asStored(readIntroduction(start(), rng()));
    expect(stageProgress(s)).toEqual({ recalled: 0, total: 2 });
    expect(describeStage(s).detail).toBe('Clean pass 1 of 2');
  });

  it('costs her one more pass over a set she has, and nothing that was scored', () => {
    const r = rng();
    const out = clearPass(asStored(readIntroduction(start(), r)), r);

    // Missing counters are not read as a rung already bought: the pass banks as
    // the first of the two, and the second still brings the next word.
    expect(out.event).toBe('stage-pass-complete');
    expect(out.session.stagePerfectRounds).toBe(1);
    expect(out.session.activeCardIds).toEqual(['c1', 'c2']);
    expect(clearPass(out.session, r).event).toBe('stage-complete');
  });

  it('leaves her banked perfect rounds alone', () => {
    const r = rng();
    const s = asStored(
      readIntroduction(start({ perfectRoundsCompleted: 4 }), r),
    );
    const out = answerCurrentCard(s, BOTH, { now: T, rng: r });
    expect(out.session.perfectRounds).toBe(4);
  });
});

describe('full-deck mastery', () => {
  const rng = () => mulberry32(6);

  it('does not finish the deck on the first flawless round', () => {
    const out = playRound(climbToMastery(start(), rng()), rng());
    expect(out.event).toBe('perfect-round');
    expect(out.session.perfectRounds).toBe(1);
    expect(out.session.deckMastered).toBe(false);
    expect(out.session.completedAt).toBeUndefined();
  });

  it('reshuffles every round', () => {
    const r = rng();
    const first = climbToMastery(start(), r);
    const second = playRound(first, r).session;
    expect(second.roundQueue).not.toEqual(first.roundQueue);
    expect([...second.roundQueue].sort()).toEqual([...DECK].sort());
  });

  it('masters the deck on the tenth flawless round', () => {
    const r = rng();
    let s = climbToMastery(start(), r);
    let out: AnswerOutcome | undefined;

    for (let round = 1; round <= 10; round++) {
      out = playRound(s, r);
      s = out.session;
      if (round < 10) expect(out.event).toBe('perfect-round');
    }

    expect(out!.event).toBe('deck-mastered');
    expect(s.perfectRounds).toBe(10);
    expect(s.deckMastered).toBe(true);
    expect(s.phase).toBe('completed');
    expect(s.completedAt).toBe(T);
  });

  it('honours a deck that asks for fewer rounds', () => {
    const r = rng();
    let s = climbToMastery(start({ perfectRunsRequired: 2 }), r);
    expect(playRound(s, r).event).toBe('perfect-round');
    s = playRound(s, r).session;
    expect(playRound(s, r).event).toBe('deck-mastered');
  });

  it('resumes on the rounds a previous session banked', () => {
    const r = rng();
    const s = climbToMastery(start({ perfectRoundsCompleted: 9 }), r);
    expect(playRound(s, r).event).toBe('deck-mastered');
  });

  describe('a mistake, in normal mode', () => {
    it('spoils the round without touching the banked ones', () => {
      const r = rng();
      let s = climbToMastery(start({ perfectRoundsCompleted: 3 }), r);
      s = playRound(s, r).session;
      expect(s.perfectRounds).toBe(4);

      const out = playRound(s, r, 2);
      expect(out.event).toBe('round-ended');
      expect(out.session.perfectRounds).toBe(4);
    });

    it('says so the moment it happens, and keeps going', () => {
      const r = rng();
      const s = climbToMastery(start(), r);
      const out = answerCurrentCard(s, NEITHER, { now: T, rng: r });
      expect(out.event).toBe('round-missed');
      expect(out.session.roundPerfect).toBe(false);
      expect(out.session.phase).toBe('fullDeckMastery');
    });

    it('brings the missed card back inside the same round', () => {
      const r = rng();
      const s = climbToMastery(start(), r);
      const missed = s.currentCardId!;

      const out = answerCurrentCard(s, NEITHER, { now: T, rng: r });
      expect(out.session.roundQueue).toHaveLength(11);
      expect(out.session.roundQueue[10]).toBe(missed);

      let cur = out.session;
      let guard = 0;
      while (cur.currentCardId !== missed) {
        if (guard++ > 50) throw new Error('missed card never returned');
        cur = answerCurrentCard(cur, BOTH, { now: T, rng: r }).session;
      }

      // Missed again, so it is owed again — but only ever one copy at a time,
      // so a bad word cannot pile up turns it will never be asked in.
      const again = answerCurrentCard(cur, NEITHER, { now: T, rng: r });
      const outstanding = again.session.roundQueue
        .slice(again.session.roundIndex)
        .filter((id) => id === missed);
      expect(outstanding).toHaveLength(1);
    });

    it('needs the missed card put right before the round can end', () => {
      const r = rng();
      const s = climbToMastery(start(), r);
      const missed = s.currentCardId!;

      // Wrong every time it comes round: the pass keeps handing it back rather
      // than closing over a word she has not recalled once.
      let cur = answerCurrentCard(s, NEITHER, { now: T, rng: r }).session;
      for (let i = 0; i < 30 && cur.phase === 'fullDeckMastery'; i++) {
        const ok = cur.currentCardId !== missed;
        cur = answerCurrentCard(cur, ok ? BOTH : NEITHER, { now: T, rng: r })
          .session;
      }
      expect(cur.roundQueue.slice(cur.roundIndex)).toContain(missed);
    });

    it('deals a fresh round after an imperfect one', () => {
      const r = rng();
      const s = climbToMastery(start(), r);
      const out = playRound(s, r, 0);
      expect(out.session.currentRound).toBe(2);
      expect(out.session.roundPerfect).toBe(true);
      expect(out.session.roundQueue).toHaveLength(10);
    });
  });

  describe('a mistake, in hard and brutal mode', () => {
    it('ends the round on the spot in hard mode', () => {
      const r = rng();
      const s = climbToMastery(start({ mode: 'hard' }), r);
      const out = answerCurrentCard(s, NEITHER, { now: T, rng: r });
      expect(out.event).toBe('round-reset');
      expect(out.session.currentRound).toBe(2);
      expect(out.session.roundIndex).toBe(0);
    });

    it('keeps the banked rounds in hard mode unless asked not to', () => {
      const r = rng();
      const s = climbToMastery(
        start({ mode: 'hard', perfectRoundsCompleted: 4 }),
        r,
      );
      expect(
        answerCurrentCard(s, NEITHER, { now: T, rng: r }).session.perfectRounds,
      ).toBe(4);
      expect(
        answerCurrentCard(s, NEITHER, { now: T, rng: r, brutalReset: true })
          .session.perfectRounds,
      ).toBe(0);
    });

    it('always wipes the banked rounds in brutal mode', () => {
      const r = rng();
      const s = climbToMastery(
        start({ mode: 'brutal', perfectRoundsCompleted: 6 }),
        r,
      );
      const out = answerCurrentCard(s, HE_ONLY, { now: T, rng: r });
      expect(out.event).toBe('round-reset');
      expect(out.session.perfectRounds).toBe(0);
    });

    it('leaves the stages themselves alike in every mode', () => {
      // The stricter rule is a rule about mastery rounds. Missing a word while
      // still learning five of them costs nothing extra in brutal mode.
      const r = rng();
      const s = readIntroduction(start({ mode: 'brutal' }), r);
      const out = answerCurrentCard(s, NEITHER, { now: T, rng: r });
      expect(out.event).toBe('retry-queued');
      expect(out.session.phase).toBe('testing');
    });
  });
});

describe('drills', () => {
  it('ends on one correct answer without touching the deck', () => {
    const out = answer(start({ cards: ['c7'], drill: true }), BOTH);
    expect(out.event).toBe('drill-complete');
    expect(out.session.completedAt).toBe(T);
    expect(out.session.deckMastered).toBe(false);
    expect(out.session.perfectRounds).toBe(0);
  });

  it('asks again after a wrong answer', () => {
    const out = answer(start({ cards: ['c7'], drill: true }), NEITHER);
    expect(out.event).toBe('retry-queued');
    expect(out.session.currentCardId).toBe('c7');
    expect(out.session.completedAt).toBeUndefined();
  });
});

describe('purity and resumability', () => {
  it('never mutates the session it is given', () => {
    const s = readIntroduction(start(), mulberry32(8));
    const before = JSON.parse(JSON.stringify(s));
    answer(s, NEITHER);
    expect(JSON.parse(JSON.stringify(s))).toEqual(before);
  });

  it('records every answer, right or wrong', () => {
    const r = mulberry32(9);
    let s = readIntroduction(start(), r);
    s = answerCurrentCard(s, BOTH, { now: T, rng: r }).session;
    s = answerCurrentCard(s, NEITHER, { now: T, rng: r }).session;
    expect(s.answers).toHaveLength(2);
    expect(s.answers[1]).toMatchObject({ hebrew: false, arabic: false, at: T });
  });

  it('recognises a ladder session, and a row from before it', () => {
    expect(isLadderSession(start())).toBe(true);
    expect(isLadderSession(undefined)).toBe(false);
    expect(
      isLadderSession({ id: 'old', deckId: 'd' } as unknown as StudySession),
    ).toBe(false);
  });
});

describe('describeStage', () => {
  const rng = () => mulberry32(12);

  it('names the first stage without counting it', () => {
    const { label } = describeStage(start());
    expect(label).toBe('Learning');
    expect(label).not.toMatch(/\d/);
  });

  it('says the set has grown without saying by how much', () => {
    const out = clearStage(readIntroduction(start(), rng()), rng());
    expect(describeStage(out.session).label).toBe('Learning more words');
  });

  it('names the testing stage without its size', () => {
    const { label, detail } = describeStage(readIntroduction(start(), rng()));
    expect(label).toBe('Testing');
    // The count is still kept and still shown, beside the headline and as pips.
    // It is not repeated here: this line says the one thing they cannot.
    expect(detail).toBe('Clean pass 1 of 2');
    expect(detail).not.toContain('recalled');
  });

  it('says which of the two clean passes she is on', () => {
    const r = rng();
    const banked = clearPass(readIntroduction(start(), r), r).session;
    expect(describeStage(banked).detail).toBe('Clean pass 2 of 2');
  });

  it('says when the pass in hand has stopped counting', () => {
    const r = rng();
    const s = readIntroduction(start(), r);
    const out = answerCurrentCard(s, NEITHER, { now: T, rng: r });
    expect(describeStage(out.session).detail).toContain('will not count');
  });

  it('calls the last stage the full deck, and says nothing of passes', () => {
    const r = rng();
    let s = start();
    while (s.activeCardCount < 10) {
      s = clearStage(readIntroduction(s, r), r).session;
    }
    const { label, detail } = describeStage(readIntroduction(s, r));
    expect(label).toBe('Full deck');
    // No second pass to be on, so no line about one — and the count is already
    // beside the headline, which leaves this rung nothing to add.
    expect(detail).toBeNull();
  });

  it('counts perfect rounds once mastery begins', () => {
    const r = rng();
    const s = playRound(climbToMastery(start(), r), r).session;
    expect(describeStage(s).label).toBe('Perfect rounds: 1 / 10');
  });

  it('warns that a spoiled round will not count', () => {
    const r = rng();
    const s = climbToMastery(start(), r);
    const out = answerCurrentCard(s, NEITHER, { now: T, rng: r });
    expect(describeStage(out.session).detail).toContain('will not count');
  });
});

describe('the ordering interlude', () => {
  const rng = () => mulberry32(6);

  /** Plays flawless rounds until something other than a perfect one comes back. */
  function playUntilInterlude(s: StudySession, r: RNG): AnswerOutcome {
    let cur = s;
    let out: AnswerOutcome | undefined;
    for (let round = 1; round <= ORDER_INTERLUDE_AFTER; round++) {
      out = playRound(cur, r);
      cur = out.session;
    }
    return out!;
  }

  it('stops the run once the banked rounds reach the interlude', () => {
    const r = rng();
    const out = playUntilInterlude(climbToMastery(start({ sequenced: true }), r), r);

    expect(out.event).toBe('ordering-due');
    expect(out.session.phase).toBe('ordering');
    expect(out.session.perfectRounds).toBe(ORDER_INTERLUDE_AFTER);
    // Nothing is dealt while she is dragging: the round after the interlude is
    // opened on the way out of it.
    expect(out.session.currentCardId).toBeUndefined();
    expect(out.session.roundQueue).toEqual([]);
  });

  it('leaves a deck of words alone', () => {
    const r = rng();
    const out = playUntilInterlude(climbToMastery(start(), r), r);

    expect(out.event).toBe('perfect-round');
    expect(out.session.phase).toBe('fullDeckMastery');
  });

  it('is one sitting of both languages, then back to the rounds', () => {
    const r = rng();
    const paused = playUntilInterlude(
      climbToMastery(start({ sequenced: true }), r),
      r,
    ).session;

    // Both columns are on the screen together, so leaving them is one call
    // rather than a Hebrew leg handing over to an Arabic one.
    const back = finishOrdering(paused, { now: T, rng: r });
    expect(back.phase).toBe('fullDeckMastery');
    expect(back.orderingDone).toBe(true);
    expect([...back.roundQueue].sort()).toEqual([...DECK].sort());
    // Consolidation, not a test: the rounds she has banked are untouched.
    expect(back.perfectRounds).toBe(ORDER_INTERLUDE_AFTER);
  });

  it('asks for it once in a run, and still masters the deck at ten', () => {
    const r = rng();
    let s = climbToMastery(start({ sequenced: true }), r);
    let out = playUntilInterlude(s, r);

    s = finishOrdering(out.session, { now: T, rng: r });

    for (let round = ORDER_INTERLUDE_AFTER + 1; round <= 10; round++) {
      out = playRound(s, r);
      s = out.session;
      expect(s.phase).not.toBe('ordering');
      if (round < 10) expect(out.event).toBe('perfect-round');
    }

    expect(out.event).toBe('deck-mastered');
    expect(s.deckMastered).toBe(true);
  });

  it('still asks a short deck, before its last round rather than after it', () => {
    const r = rng();
    // Three flawless rounds, so the usual fifth would fall past the end of the
    // deck and the interlude would never happen at all.
    let s = climbToMastery(start({ sequenced: true, perfectRunsRequired: 3 }), r);
    let out = playRound(s, r);
    expect(out.event).toBe('perfect-round');

    out = playRound(out.session, r);
    expect(out.event).toBe('ordering-due');
    expect(out.session.perfectRounds).toBe(2);

    s = finishOrdering(out.session, { now: T, rng: r });
    expect(playRound(s, r).event).toBe('deck-mastered');
  });

  it('is nothing to a session that is not in it', () => {
    const r = rng();
    const s = climbToMastery(start({ sequenced: true }), r);
    expect(finishOrdering(s, { now: T, rng: r })).toBe(s);
  });

  it('says it is asking for both languages, and that nothing is scored', () => {
    const r = rng();
    const paused = playUntilInterlude(
      climbToMastery(start({ sequenced: true }), r),
      r,
    ).session;

    const stage = describeStage(paused);
    expect(stage.label).toContain('both languages');
    expect(stage.detail).toContain('Nothing is scored');
  });
});
