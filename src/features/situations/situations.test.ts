import { describe, expect, it } from 'vitest';
import type { Category, Deck, DeckProgress } from '../../types';
import {
  SITUATIONS,
  SITUATION_CATEGORIES,
  type Situation,
} from '../../constants/situations';
import {
  chooseReply,
  currentNode,
  rehearsalOptions,
  rungsMastered,
  situationCategories,
  situationFinished,
  situationFor,
  situationParts,
  situationStatus,
  startRehearsal,
} from './situations';

const NOW = '2026-09-01T10:00:00.000Z';

function category(id: string, name: string, order: number): Category {
  return { id, name, icon: 'x', order, createdAt: NOW, updatedAt: NOW };
}

function deck(id: string, categoryId: string, name: string, order: number): Deck {
  return {
    id,
    categoryId,
    name,
    order,
    perfectRunsRequired: 5,
    promptDirections: ['en>he+ar'],
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function mastered(deckId: string): DeckProgress {
  return {
    deckId,
    perfectRunsCompleted: 5,
    hardModeFailures: 0,
    lastStudiedAt: NOW,
  };
}

/** A deterministic "random" that deals the sequence it is given, then zeros. */
function fixed(...values: number[]): () => number {
  let i = 0;
  return () => (i < values.length ? values[i++] : 0);
}

describe('the authored situations', () => {
  it('stages every part into the three language rungs', () => {
    for (const group of SITUATION_CATEGORIES) {
      expect(group.decks.length % 3, group.name).toBe(0);
      for (let i = 0; i < group.decks.length; i += 3) {
        expect(group.decks[i].name).toMatch(/ — Hebrew$/);
        expect(group.decks[i + 1].name).toMatch(/ — Palestinian Arabic$/);
        expect(group.decks[i + 2].name).toMatch(/ — Both$/);
      }
    }
  });

  it('asks the same light bar of a scenario deck that an exchange asks', () => {
    for (const group of SITUATION_CATEGORIES) {
      for (const rung of group.decks) {
        expect(rung.perfectRunsRequired, rung.name).toBe(5);
      }
    }
  });

  it('gives every turn a line to answer, and never the answer itself', () => {
    for (const group of SITUATION_CATEGORIES) {
      for (const rung of group.decks) {
        for (const turn of rung.cards) {
          expect(turn.cue?.english, rung.name + ' › ' + turn.english).toBeTruthy();
          expect(turn.english, rung.name).not.toBe(turn.cue?.english);
        }
      }
    }
  });

  it('never deals one English twice inside a rung', () => {
    // Two cards with one English are one card to the grader; inside a deck
    // that is a word dealt twice, and the official count would never settle.
    for (const group of SITUATION_CATEGORIES) {
      for (const rung of group.decks) {
        const englishes = rung.cards.map((card) => card.english.toLowerCase());
        expect(new Set(englishes).size, rung.name).toBe(englishes.length);
      }
    }
  });

  it('teaches every reply the rehearsal can ask for', () => {
    // A script choice with no deck behind it would be demanded in rehearsal
    // and taught nowhere — the one ordering this level must never invert.
    for (const situation of SITUATIONS) {
      const taught = new Set(
        situation.parts.flatMap((deckEntry) =>
          deckEntry.cards.map((card) => card.english.toLowerCase()),
        ),
      );
      for (const entry of situation.script) {
        for (const choice of entry.choices) {
          expect(
            taught.has(choice.card.english.toLowerCase()),
            situation.name + ' › ' + choice.card.english,
          ).toBe(true);
        }
      }
    }
  });

  it('points every choice at a node that exists, with every node reachable', () => {
    for (const situation of SITUATIONS) {
      const ids = new Set(situation.script.map((entry) => entry.id));
      expect(ids.size, situation.name).toBe(situation.script.length);

      const reachable = new Set<string>([situation.script[0].id]);
      // Fall-through edges and named edges together, to a fixed point.
      let grew = true;
      while (grew) {
        grew = false;
        situation.script.forEach((entry, index) => {
          if (!reachable.has(entry.id)) return;
          for (const choice of entry.choices) {
            const next = choice.next ?? situation.script[index + 1]?.id ?? 'end';
            if (next === 'end') continue;
            expect(ids.has(next), situation.name + ' › ' + next).toBe(true);
            if (!reachable.has(next)) {
              reachable.add(next);
              grew = true;
            }
          }
        });
      }
      for (const id of ids) {
        expect(reachable.has(id), situation.name + ' › ' + id).toBe(true);
      }
    }
  });

  it('always finishes: every path through a script reaches the end', () => {
    for (const situation of SITUATIONS) {
      const byId = new Map(situation.script.map((entry) => [entry.id, entry]));
      // Walk on from every choice of every node, taking first choices after
      // it; a cycle would keep a walk alive past the script's length.
      for (const entry of situation.script) {
        for (const choice of entry.choices) {
          let cursor: string | undefined = entry.id;
          let picked = choice;
          let steps = 0;
          while (cursor && steps <= situation.script.length + 1) {
            const index = situation.script.findIndex((e) => e.id === cursor);
            const next = picked.next ?? situation.script[index + 1]?.id ?? 'end';
            if (next === 'end') break;
            cursor = next;
            picked = byId.get(next)!.choices[0];
            steps += 1;
          }
          expect(steps, situation.name + ' › ' + entry.id).toBeLessThanOrEqual(
            situation.script.length,
          );
        }
      }
    }
  });

  it('branches for real: tea at the café skips the milk question', () => {
    // The branching promise, pinned on the level's flagship example. Asking
    // for tea must lead somewhere other than where coffee leads.
    const cafe = SITUATIONS.find((entry) => entry.name === 'At the café')!;
    const order = cafe.script.find((entry) => entry.id === 'order')!;
    expect(order.choices.length).toBeGreaterThan(1);
    const nexts = new Set(order.choices.map((choice) => choice.next));
    expect(nexts.size).toBe(order.choices.length);
  });

  it('offers more than one honest answer where life does', () => {
    for (const name of ['At the café', "At someone's house", 'Making a plan']) {
      const situation = SITUATIONS.find((entry) => entry.name === name)!;
      const forked = situation.script.some((entry) => entry.choices.length > 1);
      expect(forked, name).toBe(true);
    }
  });
});

describe('the area readers', () => {
  it('lists only scenario categories, in course order', () => {
    const rows = [
      category('c1', 'Greetings', 1),
      category('s2', 'At the café', 52),
      category('s1', 'Meeting someone', 51),
      category('g1', 'Answering the question', 40),
    ];
    expect(situationCategories(rows).map((row) => row.id)).toEqual(['s1', 's2']);
  });

  it('finds the authored situation for an installed category by name', () => {
    expect(situationFor(category('x', 'At the café', 1))?.icon).toBe('☕');
    expect(situationFor(category('x', 'at the café', 1))).toBeTruthy();
    expect(situationFor(category('x', 'Greetings', 1))).toBeUndefined();
  });

  it('reads status off the decks: untouched, started, complete', () => {
    const rungs = [
      deck('d1', 's1', 'The ride — Hebrew', 0),
      deck('d2', 's1', 'The ride — Palestinian Arabic', 1),
      deck('d3', 's1', 'The ride — Both', 2),
    ];
    const parts = situationParts(rungs);
    expect(situationStatus(parts, {})).toBe('not-started');
    expect(situationStatus(parts, { d1: mastered('d1') })).toBe('in-progress');
    const all = { d1: mastered('d1'), d2: mastered('d2'), d3: mastered('d3') };
    expect(situationStatus(parts, all)).toBe('complete');
    expect(situationFinished(parts, all)).toBe(true);
    expect(rungsMastered(parts, { d1: mastered('d1') })).toEqual({
      mastered: 1,
      total: 3,
    });
  });
});

describe('the rehearsal walk', () => {
  const cafe = SITUATIONS.find((entry) => entry.name === 'At the café')!;

  it('starts at the first node with nothing said', () => {
    const state = startRehearsal(cafe);
    expect(state.done).toBe(false);
    expect(state.steps).toEqual([]);
    expect(currentNode(cafe, state)?.id).toBe('welcome');
  });

  it('moves where the chosen answer leads — tea skips the milk', () => {
    let state = startRehearsal(cafe);
    state = chooseReply(cafe, state, 'Hello').state;
    expect(currentNode(cafe, state)?.id).toBe('order');

    const coffee = chooseReply(cafe, state, 'I want coffee, please');
    expect(coffee.accepted).toBe(true);
    expect(currentNode(cafe, coffee.state)?.id).toBe('milk');

    const tea = chooseReply(cafe, state, 'I want tea, please');
    expect(tea.accepted).toBe(true);
    expect(currentNode(cafe, tea.state)?.id).toBe('sugar');
  });

  it('counts a wrong answer and stays exactly where it stood', () => {
    const state = startRehearsal(cafe);
    const outcome = chooseReply(cafe, state, 'The bill, please');
    expect(outcome.accepted).toBe(false);
    expect(outcome.state.mistakes).toBe(1);
    expect(currentNode(cafe, outcome.state)?.id).toBe('welcome');
    expect(outcome.state.steps).toEqual([]);
  });

  it('reaches the end and keeps the whole transcript', () => {
    let state = startRehearsal(cafe);
    for (const english of [
      'Hello',
      'I want tea, please',
      'No, thank you. Without sugar',
      'Hot, please',
      'That is all, thank you',
      'Here you are. Thank you',
      'Goodbye',
    ]) {
      const outcome = chooseReply(cafe, state, english);
      expect(outcome.accepted, english).toBe(true);
      state = outcome.state;
    }
    expect(state.done).toBe(true);
    expect(state.mistakes).toBe(0);
    expect(state.steps.map((step) => step.said.english)).toContain(
      'I want tea, please',
    );
  });

  it('answering matches regardless of letter case', () => {
    const state = startRehearsal(cafe);
    expect(chooseReply(cafe, state, 'hello').accepted).toBe(true);
  });

  it('lays out every valid reply plus wrong ones from elsewhere', () => {
    const order = cafe.script.find((entry) => entry.id === 'order')!;
    const options = rehearsalOptions(cafe, order, fixed(0, 0, 0, 0));
    const englishes = options.map((card) => card.english);
    expect(englishes).toContain('I want coffee, please');
    expect(englishes).toContain('I want tea, please');
    expect(options.length).toBeGreaterThanOrEqual(4);
    expect(new Set(englishes).size).toBe(englishes.length);
  });
});

describe('every situation', () => {
  it('carries a scene, a goal and at least one part', () => {
    for (const situation of SITUATIONS as Situation[]) {
      expect(situation.scene.length, situation.name).toBeGreaterThan(0);
      expect(situation.goal.length, situation.name).toBeGreaterThan(0);
      expect(situation.parts.length, situation.name).toBeGreaterThan(0);
      expect(situation.script.length, situation.name).toBeGreaterThan(0);
    }
  });
});
